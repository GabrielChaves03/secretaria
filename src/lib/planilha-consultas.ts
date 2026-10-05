import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { ColunaPlanilha, LinhaPlanilha } from "@/lib/planilha";

export type { ColunaPlanilha, LinhaPlanilha } from "@/lib/planilha";

/** Linhas de uma planilha, em ordem. */
export async function listarLinhas(quadroId: string): Promise<LinhaPlanilha[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("planilha_linhas")
    .select("id, valores, ordem")
    .eq("quadro_id", quadroId)
    .order("ordem")
    .order("criado_em");
  return (data ?? []) as LinhaPlanilha[];
}

/** Colunas de uma planilha (ficam no próprio quadro). */
export async function obterColunasPlanilha(
  quadroId: string,
): Promise<ColunaPlanilha[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("quadros")
    .select("planilha_colunas")
    .eq("id", quadroId)
    .maybeSingle();
  return ((data?.planilha_colunas as ColunaPlanilha[] | null) ?? []).filter(Boolean);
}
