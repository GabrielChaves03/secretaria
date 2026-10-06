"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { obterPerfil } from "@/lib/perfil-consultas";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ColunaDemanda } from "@/lib/demandas-config";

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
