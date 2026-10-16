import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarMensagemWhatsapp } from "@/lib/whatsapp-envio";
import {
  formatarDiaMes,
  montarMensagemNitro,
  type ConfigWhatsapp,
} from "@/lib/whatsapp";

/**
 * Avisos agendados de WhatsApp — rodam sem sessão de usuário (pg_cron a
 * cada 5 min → /api/whatsapp/cron), por isso usam a service role e
 * atravessam todos os escritórios com a integração ligada.
 *
 * - Prazo (a partir das 8h de Brasília): "vence amanhã", "vence hoje" e
 *   "venceu ontem" para demandas não concluídas.
 * - Compromisso: lembrete quando faltar até 30 min.
 *
 * Cada aviso tem uma chave única em `whatsapp_avisos_enviados` — é
 * "reservada" antes do envio, então nunca sai duplicado mesmo com duas
 * execuções simultâneas. Se o envio falhar por algo passageiro (gateway
 * fora do ar), a reserva é desfeita e a próxima rodada tenta de novo.
 */

const FUSO = "America/Sao_Paulo";
const HORA_AVISO_PRAZO = 8;
const ANTECEDENCIA_COMPROMISSO_MIN = 30;

type Aviso = {
  chave: string;
  escritorioId: string;
  usuarioId: string;
  corpo: string;
  link: string | null;
};

export type ResumoAgendados = {
  candidatos: number;
  enviados: number;
  falhas: string[];
};

/** "YYYY-MM-DD" no fuso de Brasília, deslocado em `dias`. */
function diaISO(agora: Date, dias = 0) {
  const d = new Date(agora.getTime() + dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(d);
}

function horaBrasilia(agora: Date) {
  return Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: FUSO,
      hour: "numeric",
      hourCycle: "h23",
    }).format(agora),
  );
}

function horaMinuto(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export async function processarAvisosAgendados(
  origem: string,
  agora: Date = new Date(),
): Promise<ResumoAgendados> {
  const db = supabaseAdmin();
  const resumo: ResumoAgendados = { candidatos: 0, enviados: 0, falhas: [] };

  const { data: cfgs, error: erroCfg } = await db
    .from("escritorio_whatsapp")
    .select("*")
    .eq("ativo", true);
  if (erroCfg) throw erroCfg;

  const configs = new Map(
    ((cfgs ?? []) as ConfigWhatsapp[]).map((c) => [c.escritorio_id, c]),
  );
  const comPrazo = [...configs.values()]
    .filter((c) => c.notif_prazo)
    .map((c) => c.escritorio_id);
  const comCompromisso = [...configs.values()]
    .filter((c) => c.notif_compromisso)
    .map((c) => c.escritorio_id);

  const avisos: Aviso[] = [];

  // ---- Prazos
  if (comPrazo.length && horaBrasilia(agora) >= HORA_AVISO_PRAZO) {
    const ontem = diaISO(agora, -1);
    const hoje = diaISO(agora);
    const amanha = diaISO(agora, 1);

    const { data, error } = await db
      .from("demandas")
      .select("id, escritorio_id, usuario_id, titulo, data_entrega")
      .in("escritorio_id", comPrazo)
      .neq("status", "concluida")
      .in("data_entrega", [ontem, hoje, amanha]);
    if (error) throw error;

    for (const d of data ?? []) {
      const tipo =
        d.data_entrega === amanha ? "amanha" : d.data_entrega === hoje ? "hoje" : "atrasada";
      const corpo =
        tipo === "amanha"
          ? `⏳ *${d.titulo}* vence amanhã (${formatarDiaMes(d.data_entrega)}).`
          : tipo === "hoje"
            ? `⚠️ *${d.titulo}* vence *hoje*.`
            : `🔴 *${d.titulo}* venceu ontem (${formatarDiaMes(d.data_entrega)}) e ainda não foi concluída.`;
      avisos.push({
        chave: `prazo:${d.id}:${tipo}:${d.data_entrega}`,
        escritorioId: d.escritorio_id,
        usuarioId: d.usuario_id,
        corpo,
        link: `${origem}/dashboard/${d.id}/editar`,
      });
    }
  }

  // ---- Compromissos
  if (comCompromisso.length) {
    const limite = new Date(agora.getTime() + ANTECEDENCIA_COMPROMISSO_MIN * 60_000);
    const { data, error } = await db
      .from("compromissos")
      .select("id, escritorio_id, usuario_id, titulo, data_hora")
      .in("escritorio_id", comCompromisso)
      .gt("data_hora", agora.toISOString())
      .lte("data_hora", limite.toISOString());
    if (error) throw error;

    for (const c of data ?? []) {
      const faltam = Math.max(
        1,
        Math.round((new Date(c.data_hora).getTime() - agora.getTime()) / 60_000),
      );
      avisos.push({
        chave: `compromisso:${c.id}:${c.data_hora}`,
        escritorioId: c.escritorio_id,
        usuarioId: c.usuario_id,
        corpo: `⏰ *${c.titulo}* começa às ${horaMinuto(c.data_hora)} (em ${faltam} min).`,
        link: `${origem}/calendario`,
      });
    }
  }

  resumo.candidatos = avisos.length;
  if (!avisos.length) return resumo;

  // Destinatários: precisam de telefone e não ter desligado os avisos.
  const { data: pessoas, error: erroPessoas } = await db
    .from("usuarios")
    .select("id, nome, papel, telefone, whatsapp_ativo")
    .in("id", [...new Set(avisos.map((a) => a.usuarioId))]);
  if (erroPessoas) throw erroPessoas;
  const porId = new Map((pessoas ?? []).map((p) => [p.id as string, p]));

  const enviaveis = avisos.filter((a) => {
    const p = porId.get(a.usuarioId);
    return p && p.whatsapp_ativo !== false && p.telefone;
  });
  if (!enviaveis.length) return resumo;

  // Reserva as chaves; só volta o que ainda não tinha sido enviado.
  const { data: reservadas, error: erroReserva } = await db
    .from("whatsapp_avisos_enviados")
    .upsert(
      enviaveis.map((a) => ({ chave: a.chave, escritorio_id: a.escritorioId })),
      { onConflict: "chave", ignoreDuplicates: true },
    )
    .select("chave");
  if (erroReserva) throw erroReserva;
  const novas = new Set((reservadas ?? []).map((r) => r.chave as string));

  for (const a of enviaveis) {
    if (!novas.has(a.chave)) continue;
    const p = porId.get(a.usuarioId)!;
    const mensagem = montarMensagemNitro({
      nome: p.nome as string | null,
      papel: p.papel as string | null,
      corpo: a.corpo,
      link: a.link,
    });
    const r = await enviarMensagemWhatsapp(
      configs.get(a.escritorioId)!,
      p.telefone as string,
      mensagem,
    );
    if (r.ok) {
      resumo.enviados++;
    } else {
      resumo.falhas.push(`${a.chave}: ${r.motivo}`);
      if (!r.definitivo) {
        await db.from("whatsapp_avisos_enviados").delete().eq("chave", a.chave);
      }
    }
  }

  return resumo;
}
