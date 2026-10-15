"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { obterPerfil } from "@/lib/perfil-consultas";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  CONFIG_PADRAO,
  TIPOS_PERSONALIZADOS,
  type ColunaDemanda,
} from "@/lib/demandas-config";

async function exigirChefe() {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (perfil.papel !== "chefe" || !perfil.escritorioId) {
    throw new Error("Sem permissão.");
  }
  return perfil.escritorioId;
}

/**
 * Salva os status do escritório (nome/cor/ordem). `migracoes` move as demandas
 * que estavam num status renomeado/removido para o novo valor, pra nenhuma
 * ficar "órfã".
 */
export async function salvarStatusConfig(
  statuses: string[],
  cores: Record<string, string>,
  migracoes: { de: string; para: string }[],
) {
  const escritorioId = await exigirChefe();

  const limpos = statuses.map((s) => s.trim()).filter(Boolean);
  const unicos = [...new Set(limpos)];
  if (unicos.length === 0) return { erro: "Tenha pelo menos um status." };

  const coresLimpas: Record<string, string> = {};
  for (const s of unicos) coresLimpas[s] = cores[s] ?? "#C4C4C4";

  const supabase = await criarClienteServidor();

  const { error } = await supabase.from("escritorio_demandas_config").upsert(
    {
      escritorio_id: escritorioId,
      statuses: unicos,
      status_cores: coresLimpas,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "escritorio_id" },
  );
  if (error) return { erro: error.message };

  // Reaponta as demandas dos status que mudaram de nome/foram removidos.
  for (const m of migracoes) {
    if (!m.de || !m.para || m.de === m.para) continue;
    await supabase
      .from("demandas")
      .update({ status: m.para })
      .eq("escritorio_id", escritorioId)
      .eq("status", m.de);
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/ajustes");
  return { ok: true };
}

/** Liga/desliga colunas de sistema das demandas (Prazo/Prioridade/Notas/Link). */
export async function salvarColunasAtivas(ativos: Record<string, boolean>) {
  const escritorioId = await exigirChefe();
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("escritorio_demandas_config")
    .select("colunas")
    .eq("escritorio_id", escritorioId)
    .maybeSingle();

  const colunas = (data?.colunas as ColunaDemanda[] | null) ?? null;
  if (!colunas) return { ok: true };

  const prox = colunas.map((c) =>
    c.id === "responsavel" || c.id === "status"
      ? c
      : { ...c, ativo: ativos[c.id] ?? c.ativo },
  );

  await supabase
    .from("escritorio_demandas_config")
    .upsert(
      { escritorio_id: escritorioId, colunas: prox, atualizado_em: new Date().toISOString() },
      { onConflict: "escritorio_id" },
    );

  revalidatePath("/dashboard", "layout");
  revalidatePath("/ajustes");
  return { ok: true };
}

/**
 * Salva as colunas personalizadas do escritório (nome/tipo/opções/ordem).
 * As de sistema ficam como estão. Coluna removida some da tela, mas o valor
 * continua guardado em `demandas.campos` (recriar com o mesmo id não acontece —
 * ids novos são sempre únicos), então nada é apagado das demandas.
 */
export async function salvarColunasPersonalizadas(
  personalizadas: { id: string | null; nome: string; tipo: string; opcoes: string[] }[],
) {
  const escritorioId = await exigirChefe();
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("escritorio_demandas_config")
    .select("colunas")
    .eq("escritorio_id", escritorioId)
    .maybeSingle();

  const atuais = (data?.colunas as ColunaDemanda[] | null) ?? CONFIG_PADRAO.colunas;
  const sistema = atuais.filter((c) => c.sistema);
  const tiposOk = new Set(TIPOS_PERSONALIZADOS.map((t) => t.tipo as string));
  const nomesSistema = new Set(sistema.map((c) => c.nome.toLowerCase()));

  const novas: ColunaDemanda[] = [];
  const vistos = new Set<string>();
  for (const p of personalizadas) {
    const nome = p.nome.trim().slice(0, 40);
    if (!nome) continue;
    const chave = nome.toLowerCase();
    if (nomesSistema.has(chave) || vistos.has(chave)) {
      return { erro: `Já existe uma coluna chamada "${nome}".` };
    }
    vistos.add(chave);
    if (!tiposOk.has(p.tipo)) return { erro: `Tipo inválido na coluna "${nome}".` };
    const anterior = p.id ? atuais.find((c) => c.id === p.id && !c.sistema) : undefined;
    const opcoes =
      p.tipo === "selecao"
        ? [...new Set(p.opcoes.map((o) => o.trim()).filter(Boolean))].slice(0, 30)
        : undefined;
    novas.push({
      id: anterior?.id ?? `c_${crypto.randomUUID().slice(0, 8)}`,
      nome,
      tipo: p.tipo as ColunaDemanda["tipo"],
      ativo: anterior?.ativo ?? true,
      sistema: false,
      ...(opcoes ? { opcoes } : {}),
    });
  }

  const { error } = await supabase.from("escritorio_demandas_config").upsert(
    {
      escritorio_id: escritorioId,
      colunas: [...sistema, ...novas],
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "escritorio_id" },
  );
  if (error) return { erro: error.message };

  revalidatePath("/dashboard", "layout");
  revalidatePath("/ajustes");
  return { ok: true };
}
