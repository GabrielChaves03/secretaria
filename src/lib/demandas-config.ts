/**
 * Config de demandas por escritório (statuses + colunas), client-safe.
 * Vinda da fusão com o Avant — espelha o `config` global dele, por escritório.
 */

export type TipoColuna =
  | "pessoa"
  | "status"
  | "data"
  | "prioridade"
  | "texto"
  | "link"
  | "numero"
  | "selecao";

export type ColunaDemanda = {
  id: string;
  nome: string;
  tipo: TipoColuna;
  ativo: boolean;
  sistema: boolean;
  /** Só colunas personalizadas do tipo "selecao": valores possíveis. */
  opcoes?: string[];
};

/** Tipos que o chefe pode escolher ao criar uma coluna personalizada. */
export const TIPOS_PERSONALIZADOS: { tipo: TipoColuna; rotulo: string }[] = [
  { tipo: "texto", rotulo: "Texto" },
  { tipo: "numero", rotulo: "Número" },
  { tipo: "data", rotulo: "Data" },
  { tipo: "link", rotulo: "Link" },
  { tipo: "selecao", rotulo: "Seleção" },
];

/** Colunas criadas pelo escritório (valor guardado em `demandas.campos[id]`). */
export function colunasPersonalizadas(cfg: ConfigDemandas): ColunaDemanda[] {
  return cfg.colunas.filter((c) => !c.sistema);
}

export type ConfigDemandas = {
  statuses: string[];
  statusCores: Record<string, string>;
  colunas: ColunaDemanda[];
  showSummary: boolean;
};

export const STATUSES_PADRAO = [
  "A fazer",
  "Em Andamento",
  "Falta Revisar",
  "Concluído",
];

export const CORES_STATUS_PADRAO: Record<string, string> = {
  "A fazer": "#C4C4C4",
  "Em Andamento": "#579BFC",
  "Falta Revisar": "#FDAB3D",
  Concluído: "#00C875",
};

export const CONFIG_PADRAO: ConfigDemandas = {
  statuses: STATUSES_PADRAO,
  statusCores: CORES_STATUS_PADRAO,
  colunas: [
    { id: "responsavel", nome: "Responsável", tipo: "pessoa", ativo: true, sistema: true },
    { id: "status", nome: "Status", tipo: "status", ativo: true, sistema: true },
    { id: "prazo", nome: "Prazo", tipo: "data", ativo: true, sistema: true },
    { id: "prioridade", nome: "Prioridade", tipo: "prioridade", ativo: true, sistema: true },
    { id: "notas", nome: "Notas", tipo: "texto", ativo: true, sistema: true },
    { id: "link", nome: "Link", tipo: "link", ativo: true, sistema: true },
  ],
  showSummary: true,
};

/** Cor de um status, com fallback. */
export function corDoStatus(cfg: ConfigDemandas, status: string): string {
  return cfg.statusCores[status] ?? CORES_STATUS_PADRAO[status] ?? "#C4C4C4";
}
