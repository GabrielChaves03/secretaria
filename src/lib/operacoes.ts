/**
 * Tipos de Operações e Quadros — client-safe (sem import de servidor).
 * Operação (pasta) → Quadro (board/planilha) → [quadros-filhos aninhados].
 */

export type Operacao = {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
};

export type TipoQuadro = "tarefas" | "anotacoes" | "planilha";

export type Quadro = {
  id: string;
  operacao_id: string;
  quadro_pai_id: string | null;
  nome: string;
  cor: string;
  tipo: TipoQuadro;
  ordem: number;
  primeiro_grupo: string;
  grupos_ordem: string[];
  grupos_cores: Record<string, string>;
  planilha_colunas: unknown[];
};

/** Quadro com a contagem de itens (tarefas ou linhas). */
export type QuadroComTotal = Quadro & { total: number };

/** Quadro de topo com os quadros-filhos aninhados (ex.: planilhas). */
export type QuadroNode = QuadroComTotal & { filhos: QuadroComTotal[] };

export type OperacaoComQuadros = Operacao & {
  quadros: QuadroNode[];
};

export const CORES_OPERACAO = [
  "#00CA72",
  "#579BFC",
  "#FDAB3D",
  "#E2445C",
  "#A25DDC",
  "#00D2D2",
  "#FF5AC4",
  "#FF642E",
];
