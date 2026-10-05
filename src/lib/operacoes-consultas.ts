import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  Operacao,
  OperacaoComQuadros,
  Quadro,
} from "@/lib/operacoes";

export type { Operacao, Quadro, OperacaoComQuadros } from "@/lib/operacoes";

/**
 * Operações do escritório com os seus quadros e a contagem de demandas de
 * cada quadro. A RLS já isola por escritório; a contagem respeita o recorte
 * de demandas da pessoa (funcionário só conta as próprias; chefe conta todas).
 */
export async function listarOperacoesComQuadros(): Promise<OperacaoComQuadros[]> {
  const supabase = await criarClienteServidor();

  const [{ data: ops }, { data: quads }, { data: dems }] = await Promise.all([
    supabase.from("operacoes").select("*").order("ordem").order("criado_em"),
    supabase.from("quadros").select("*").order("ordem").order("criado_em"),
    supabase.from("demandas").select("quadro_id"),
  ]);

  const contagem = new Map<string, number>();
  for (const d of dems ?? []) {
    const q = (d as { quadro_id: string | null }).quadro_id;
    if (q) contagem.set(q, (contagem.get(q) ?? 0) + 1);
  }

  const quadrosPorOp = new Map<string, (Quadro & { total: number })[]>();
  for (const q of (quads ?? []) as Quadro[]) {
    const arr = quadrosPorOp.get(q.operacao_id) ?? [];
    arr.push({ ...q, total: contagem.get(q.id) ?? 0 });
    quadrosPorOp.set(q.operacao_id, arr);
  }

  return ((ops ?? []) as Operacao[]).map((o) => ({
    ...o,
    quadros: quadrosPorOp.get(o.id) ?? [],
  }));
}

/** Um quadro pelo id (ou `null` se não existe / sem acesso). */
export async function obterQuadro(id: string): Promise<Quadro | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("quadros")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Quadro | null) ?? null;
}

/** A operação de um quadro (para o breadcrumb). */
export async function obterOperacao(id: string): Promise<Operacao | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("operacoes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Operacao | null) ?? null;
}
