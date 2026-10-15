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
  /** Cor de cada valor de seleção ({valor: cor}); sem entrada = cor automática. */
  cores?: Record<string, string>;
};

/** Tipos que o chefe pode escolher ao criar uma coluna personalizada. */
export const TIPOS_PERSONALIZADOS: { tipo: TipoColuna; rotulo: string }[] = [
  { tipo: "texto", rotulo: "Texto" },
  { tipo: "numero", rotulo: "Número" },
  { tipo: "data", rotulo: "Data" },
  { tipo: "link", rotulo: "Link" },
  { tipo: "selecao", rotulo: "Seleção" },
];

/** Colunas personalizadas (valor guardado em `demandas.campos[id]`). */
export function colunasPersonalizadas(cfg: ConfigDemandas): ColunaDemanda[] {
  return cfg.colunas.filter((c) => !c.sistema);
}

/** Ids das colunas de sistema — fixas no código, não podem ser excluídas. */
export const IDS_SISTEMA = CONFIG_PADRAO_COLUNAS().map((c) => c.id);

/** Colunas padrão (para recolocar uma que o quadro excluiu). */
export function COLUNAS_PADRAO(): ColunaDemanda[] {
  return CONFIG_PADRAO_COLUNAS();
}

function CONFIG_PADRAO_COLUNAS(): ColunaDemanda[] {
  return [
    { id: "responsavel", nome: "Responsável", tipo: "pessoa", ativo: true, sistema: true },
    { id: "status", nome: "Status", tipo: "status", ativo: true, sistema: true },
    { id: "prazo", nome: "Prazo", tipo: "data", ativo: true, sistema: true },
    { id: "prioridade", nome: "Prioridade", tipo: "prioridade", ativo: true, sistema: true },
    { id: "notas", nome: "Notas", tipo: "texto", ativo: true, sistema: true },
    { id: "link", nome: "Link", tipo: "link", ativo: true, sistema: true },
  ];
}

/**
 * Colunas de UM quadro: as que ele salvou (`quadros.colunas_demandas`) ou, se
 * ainda não foi personalizado, as de sistema do escritório. O quadro pode
 * excluir qualquer coluna, inclusive as padrão (o dado continua na demanda;
 * a coluna padrão volta pelo "+" da tabela).
 */
export function colunasDoQuadro(cfg: ConfigDemandas, salvas: unknown): ColunaDemanda[] {
  if (Array.isArray(salvas)) {
    return (salvas as ColunaDemanda[]).filter((c) => c && typeof c.id === "string");
  }
  return cfg.colunas.filter((c) => c.sistema);
}

/** Config do escritório com as colunas trocadas pelas do quadro. */
export function configDoQuadro(cfg: ConfigDemandas, salvas: unknown): ConfigDemandas {
  return { ...cfg, colunas: colunasDoQuadro(cfg, salvas) };
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
