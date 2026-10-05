/**
 * Tipos de planilha (tabela livre), client-safe. As colunas ficam no quadro
 * (`quadros.planilha_colunas`); as linhas em `planilha_linhas`.
 */

export type TipoColunaPlanilha = "texto" | "select" | "link" | "numero";

export type ColunaPlanilha = {
  id: string;
  nome: string;
  tipo: TipoColunaPlanilha;
  /** Opções, quando tipo = "select". */
  opcoes?: string[];
};

export type LinhaPlanilha = {
  id: string;
  valores: Record<string, string>;
  ordem: number;
};

/** Gera um id curto para coluna/linha novas. */
export function novoIdPlanilha(prefixo: string): string {
  return `${prefixo}_${Math.random().toString(36).slice(2, 10)}`;
}
