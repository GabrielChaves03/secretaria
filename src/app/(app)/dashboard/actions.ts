"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehDificuldade } from "@/lib/demandas";
import { avisarDono } from "@/lib/whatsapp-envio";
import { formatarDiaMes } from "@/lib/whatsapp";

export type EstadoDemanda = { erro: string } | { ok: true } | undefined;

/** Extrai e normaliza os campos do formulário de demanda. */
function lerCampos(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    dataEntrega: String(formData.get("data_entrega") ?? "").trim(),
    dificuldade: String(formData.get("dificuldade") ?? "").trim(),
    /** Só vem no formulário do chefe; vazio = não mexe no responsável. */
    responsavelId: String(formData.get("responsavel_id") ?? "").trim(),
    /** Quadro onde criar a demanda (vazio = sem quadro). */
    quadroId: String(formData.get("quadro_id") ?? "").trim(),
    grupo: String(formData.get("grupo") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    prioridade: String(formData.get("prioridade") ?? "").trim(),
    link: String(formData.get("link") ?? "").trim(),
    /** Colunas personalizadas: inputs `campo:<id>` (só as que vieram no form). */
    campos: lerCamposPersonalizados(formData),
  };
}

function lerCamposPersonalizados(formData: FormData): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("campo:")) continue;
    const id = chave.slice("campo:".length);
    if (id) campos[id] = String(valor).trim().slice(0, 2000);
  }
  return campos;
}

/** Junta campos novos aos existentes, descartando os vazios. */
function mesclarCampos(antes: Record<string, string>, novos: Record<string, string>) {
  const r: Record<string, string> = { ...antes, ...novos };
  for (const k of Object.keys(r)) if (!r[k]) delete r[k];
  return r;
}

/** Corpo do aviso de WhatsApp de demanda atribuída. */
function corpoAtribuicao(titulo: string, dataEntrega: string, descricao: string) {
  const linhas = [`📌 Você tem uma nova demanda: *${titulo}*`];
  if (dataEntrega) linhas.push(`Prazo: ${formatarDiaMes(dataEntrega)}`);
  if (descricao) {
    linhas.push(descricao.length > 280 ? `${descricao.slice(0, 280)}…` : descricao);
  }
  return linhas.join("\n");
}

/**
 * Cria uma demanda. Por padrão é do usuário logado; o chefe pode escolher
 * outro membro como responsável (`responsavel_id` — a RLS só aceita membro
 * do mesmo escritório), e aí o responsável é avisado.
 */
export async function criarDemanda(
  _estadoAnterior: EstadoDemanda,
  formData: FormData,
): Promise<EstadoDemanda> {
  const usuario = await requererUsuario();
  const {
    titulo,
    descricao,
    dataEntrega,
    dificuldade,
    responsavelId,
    quadroId,
    grupo,
    status,
    prioridade,
    link,
    campos,
  } = lerCampos(formData);

  if (!titulo) return { erro: "Informe o título." };
  if (!ehDificuldade(dificuldade)) return { erro: "Dificuldade inválida." };

  const donoId = responsavelId || usuario.id;

  const supabase = await criarClienteServidor();
  const { data: criada, error } = await supabase
    .from("demandas")
    .insert({
      usuario_id: donoId,
      titulo,
      descricao: descricao || null,
      data_entrega: dataEntrega || null,
      dificuldade,
      quadro_id: quadroId || null,
      grupo: grupo || null,
      status: status || "A fazer",
      prioridade: prioridade || null,
      link: link || null,
      campos: mesclarCampos({}, campos),
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };

  if (donoId !== usuario.id) {
    await avisarDono({
      donoId,
      tipo: "atribuicao",
      corpo: corpoAtribuicao(titulo, dataEntrega, descricao),
      demandaId: criada.id as string,
    });
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/**
 * Atualiza os dados de uma demanda. Quem pode editar (dono ou chefe) é
 * decidido pela RLS — por isso não filtramos por `usuario_id` aqui.
 */
export async function atualizarDemanda(
  _estadoAnterior: EstadoDemanda,
  formData: FormData,
): Promise<EstadoDemanda> {
  const usuario = await requererUsuario();
  const id = String(formData.get("id") ?? "");
  const {
    titulo,
    descricao,
    dataEntrega,
    dificuldade,
    responsavelId,
    status,
    prioridade,
    link,
    campos,
  } = lerCampos(formData);

  if (!id) return { erro: "Demanda não identificada." };
  if (!titulo) return { erro: "Informe o título." };
  if (!ehDificuldade(dificuldade)) return { erro: "Dificuldade inválida." };

  const supabase = await criarClienteServidor();

  const { data: antes } = await supabase
    .from("demandas")
    .select("usuario_id, status, campos")
    .eq("id", id)
    .maybeSingle();
  const donoAnterior = antes?.usuario_id as string | undefined;
  const statusAnterior = antes?.status as string | undefined;

  const { data: demanda, error } = await supabase
    .from("demandas")
    .update({
      titulo,
      descricao: descricao || null,
      data_entrega: dataEntrega || null,
      dificuldade,
      prioridade: prioridade || null,
      link: link || null,
      ...(Object.keys(campos).length > 0
        ? {
            campos: mesclarCampos(
              (antes?.campos as Record<string, string> | null) ?? {},
              campos,
            ),
          }
        : {}),
      ...(status ? { status } : {}),
      ...(responsavelId ? { usuario_id: responsavelId } : {}),
    })
    .eq("id", id)
    .select("usuario_id, titulo")
    .maybeSingle();

  if (error) return { erro: error.message };

  const donoId = demanda?.usuario_id as string | undefined;
  if (donoId && donoId !== usuario.id) {
    const reatribuida = donoId !== donoAnterior;
    const mudouStatus = !!status && status !== statusAnterior;
    if (reatribuida) {
      await avisarDono({
        donoId,
        tipo: "atribuicao",
        corpo: corpoAtribuicao(titulo, dataEntrega, descricao),
        demandaId: id,
      });
    } else if (mudouStatus) {
      await avisarDono({
        donoId,
        tipo: "status",
        corpo: `🔄 A demanda *${titulo}* agora está *${status}*.`,
        demandaId: id,
      });
    } else {
      await avisarDono({
        donoId,
        tipo: "status",
        corpo: `✏️ A demanda *${titulo}* foi atualizada.`,
        demandaId: id,
      });
    }
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Aviso de WhatsApp de troca de status, se quem mudou não é o dono. */
async function avisarMudancaStatus(
  demanda: { usuario_id: unknown; titulo: unknown } | null,
  id: string,
  status: string,
  atorId: string,
) {
  const donoId = demanda?.usuario_id as string | undefined;
  if (!donoId || donoId === atorId) return;
  await avisarDono({
    donoId,
    tipo: "status",
    corpo: `🔄 A demanda *${demanda?.titulo}* agora está *${status}*.`,
    demandaId: id,
  });
}

/**
 * Apaga uma demanda. Dono ou chefe — a RLS decide (migration 0007).
 */
export async function apagarDemanda(formData: FormData) {
  await requererUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await criarClienteServidor();
  await supabase.from("demandas").delete().eq("id", id);

  revalidatePath("/dashboard", "layout");
}

/**
 * Adiciona um comentário a uma demanda. A RLS garante que só o dono da
 * demanda ou um chefe conseguem inserir. Guarda o nome do autor junto.
 */
export async function adicionarComentario(formData: FormData) {
  const usuario = await requererUsuario();
  const demandaId = String(formData.get("demanda_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();

  if (!demandaId || !texto) return;

  const supabase = await criarClienteServidor();

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nome")
    .eq("id", usuario.id)
    .maybeSingle();
  const autorNome = (perfil?.nome as string | null) ?? "Alguém";

  await supabase.from("comentarios").insert({
    demanda_id: demandaId,
    usuario_id: usuario.id,
    texto,
    autor_nome: (perfil?.nome as string | null) ?? null,
  });

  const { data: demanda } = await supabase
    .from("demandas")
    .select("usuario_id, titulo")
    .eq("id", demandaId)
    .maybeSingle();
  const donoId = demanda?.usuario_id as string | undefined;
  if (donoId && donoId !== usuario.id) {
    const trecho = texto.length > 300 ? `${texto.slice(0, 300)}…` : texto;
    await avisarDono({
      donoId,
      tipo: "comentario",
      corpo: `💬 ${autorNome} comentou em *${demanda?.titulo}*:\n"${trecho}"`,
      demandaId,
    });
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/dashboard/${demandaId}/editar`);
}

/**
 * Move uma demanda para outro status: `destino = "status:<nome>"`.
 * Dono ou chefe — a RLS decide. Avisa o dono no WhatsApp se não foi ele.
 */
export async function moverDemanda(id: string, destino: string) {
  const usuario = await requererUsuario();
  if (!id || !destino.startsWith("status:")) return;
  const status = destino.slice("status:".length).trim();
  if (!status) return;

  const supabase = await criarClienteServidor();
  const { data: antes } = await supabase
    .from("demandas")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const { data: demanda } = await supabase
    .from("demandas")
    .update({ status })
    .eq("id", id)
    .select("usuario_id, titulo")
    .maybeSingle();

  if (antes?.status !== status) {
    await avisarMudancaStatus(demanda, id, status, usuario.id);
  }

  revalidatePath("/dashboard", "layout");
}

/**
 * Grava o valor de UMA coluna personalizada (edição direto na célula da
 * Tabela). Dono ou chefe — a RLS decide. Sem aviso de WhatsApp: é edição
 * miúda, avisar a cada célula viraria spam.
 */
export async function salvarCampoDemanda(id: string, colunaId: string, valor: string) {
  await requererUsuario();
  if (!id || !colunaId) return { erro: "Campo inválido." };

  const supabase = await criarClienteServidor();
  const { data: antes } = await supabase
    .from("demandas")
    .select("campos")
    .eq("id", id)
    .maybeSingle();
  if (!antes) return { erro: "Demanda não encontrada." };

  const campos = mesclarCampos((antes.campos as Record<string, string> | null) ?? {}, {
    [colunaId]: valor.trim().slice(0, 2000),
  });
  const { error } = await supabase.from("demandas").update({ campos }).eq("id", id);
  if (error) return { erro: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/**
 * Marca todas as notificações não lidas do usuário logado como lidas.
 */
export async function marcarNotificacoesLidas() {
  const usuario = await requererUsuario();

  const supabase = await criarClienteServidor();
  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("usuario_id", usuario.id)
    .eq("lida", false);

  revalidatePath("/dashboard", "layout");
}
