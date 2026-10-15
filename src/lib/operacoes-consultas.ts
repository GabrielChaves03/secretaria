import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  Operacao,
  OperacaoComQuadros,
  Quadro,
  QuadroComTotal,
  QuadroNode,
} from "@/lib/operacoes";

export type {
  Operacao,
  Quadro,
  QuadroNode,
  OperacaoComQuadros,
} from "@/lib/operacoes";

/**
 * Operações do escritório com os quadros aninhados (topo + filhos) e a
 * contagem de itens de cada um: demandas (quadro de tarefas) ou linhas
 * (planilha). A RLS isola por escritório; a contagem de demandas respeita o
 * recorte da pessoa (funcionário conta as próprias; chefe conta todas).
 */
export async function listarOperacoesComQuadros(): Promise<OperacaoComQuadros[]> {
  const supabase = await criarClienteServidor();

  const [{ data: ops }, { data: quads }, { data: dems }, { data: linhas }] =
    await Promise.all([
      supabase.from("operacoes").select("*").order("ordem").order("criado_em"),
      supabase.from("quadros").select("*").order("ordem").order("criado_em"),
      supabase.from("demandas").select("quadro_id"),
      supabase.from("planilha_linhas").select("quadro_id"),
    ]);

  const totalPorQuadro = new Map<string, number>();
  for (const d of dems ?? []) {
    const q = (d as { quadro_id: string | null }).quadro_id;
    if (q) totalPorQuadro.set(q, (totalPorQuadro.get(q) ?? 0) + 1);
  }
  for (const l of linhas ?? []) {
    const q = (l as { quadro_id: string }).quadro_id;
    totalPorQuadro.set(q, (totalPorQuadro.get(q) ?? 0) + 1);
  }

  const comTotal = (q: Quadro): QuadroComTotal => ({
    ...q,
    total: totalPorQuadro.get(q.id) ?? 0,
  });

  const todos = (quads ?? []) as Quadro[];
  const filhosPorPai = new Map<string, QuadroComTotal[]>();
  for (const q of todos) {
    if (q.quadro_pai_id) {
      const arr = filhosPorPai.get(q.quadro_pai_id) ?? [];
      arr.push(comTotal(q));
      filhosPorPai.set(q.quadro_pai_id, arr);
    }
  }

  const nodesPorOp = new Map<string, QuadroNode[]>();
  for (const q of todos) {
    if (q.quadro_pai_id) continue; // filhos entram aninhados
    const arr = nodesPorOp.get(q.operacao_id) ?? [];
    arr.push({ ...comTotal(q), filhos: filhosPorPai.get(q.id) ?? [] });
    nodesPorOp.set(q.operacao_id, arr);
  }

  return ((ops ?? []) as Operacao[]).map((o) => ({
    ...o,
    quadros: nodesPorOp.get(o.id) ?? [],
  }));
}

export async function obterQuadro(id: string): Promise<Quadro | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("quadros")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Quadro | null) ?? null;
}

export async function obterOperacao(id: string): Promise<Operacao | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("operacoes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Operacao | null) ?? null;
}

/**
 * Quadros de TAREFAS do escritório (topo e aninhados), com o nome da operação —
 * para escolher onde criar uma demanda fora de um quadro (Meu Trabalho).
 */
export async function listarQuadrosDeTarefas(): Promise<
  (Quadro & { operacao_nome: string })[]
> {
  const ops = await listarOperacoesComQuadros();
  const lista: (Quadro & { operacao_nome: string })[] = [];
  for (const o of ops) {
    for (const q of o.quadros) {
      for (const x of [q, ...q.filhos]) {
        if (x.tipo === "tarefas") lista.push({ ...x, operacao_nome: o.nome });
      }
    }
  }
  return lista;
}
