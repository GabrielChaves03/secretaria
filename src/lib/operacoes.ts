/**
 * Tipos de Operações e Quadros — client-safe (sem import de servidor).
 * Trazido da fusão com o AvantPro: Operação (pasta) → Quadro (board).
 * Consultas em `operacoes-consultas.ts` (server-only).
 */

export type Operacao = {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
};

export type TipoQuadro = "tarefas" | "anotacoes";

export type Quadro = {
  id: string;
  operacao_id: string;
  nome: string;
  cor: string;
  tipo: TipoQuadro;
  ordem: number;
  primeiro_grupo: string;
  grupos_ordem: string[];
  grupos_cores: Record<string, string>;
};

/** Uma operação com os seus quadros e a contagem de itens de cada um. */
export type OperacaoComQuadros = Operacao & {
  quadros: (Quadro & { total: number })[];
};

/** Paleta das operações/quadros (mesma do Avant). */
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
