/**
 * Tipos, constantes e rótulos das demandas.
 *
 * Client-safe: usado tanto por Server Components/Actions quanto pelos
 * componentes de UI. As consultas ao banco ficam em `demandas-consultas.ts`.
 *
 * Status (desde a fusão com o Avant) é TEXTO LIVRE, customizável por
 * escritório (`escritorio_demandas_config.statuses`). "Concluído" é o status
 * terminal (progresso e atraso levam isso em conta).
 */

export const DIFICULDADES = ["facil", "media", "dificil"] as const;
export const PRIORIDADES = ["Alta", "Média", "Baixa"] as const;
export const PAPEIS = ["funcionario", "chefe"] as const;

export type Dificuldade = (typeof DIFICULDADES)[number];
export type Prioridade = (typeof PRIORIDADES)[number];
export type Papel = (typeof PAPEIS)[number];

/** Status terminal (demanda concluída). Mesmo nome que o Avant usa. */
export const STATUS_CONCLUIDO = "Concluído";

export const ROTULO_PAPEL: Record<Papel, string> = {
  funcionario: "Funcionário",
  chefe: "Chefe",
};

export type Demanda = {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao: string | null;
  data_entrega: string | null;
  dificuldade: Dificuldade;
  status: string;
  /** Lista personalizada (legado); hoje o board usa status/grupo. */
  lista_id: string | null;
  /** Quadro (board) a que a demanda pertence. */
  quadro_id: string | null;
  /** Grupo (seção) dentro do quadro. */
  grupo: string | null;
  prioridade: string | null;
  link: string | null;
  campos: Record<string, string>;
  criado_em: string;
};

/** Demanda com o nome do dono resolvido — usado na visão do chefe. */
export type DemandaComDono = Demanda & { dono_nome: string | null };

export const ROTULO_DIFICULDADE: Record<Dificuldade, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

/** Classe da pílula por dificuldade — verde/amarelo/vermelho. */
export const PILL_DIFICULDADE: Record<Dificuldade, string> = {
  facil: "pill pill-green",
  media: "pill pill-yellow",
  dificil: "pill pill-red",
};

/** Classe da pílula por prioridade. */
export const PILL_PRIORIDADE: Record<string, string> = {
  Alta: "pill pill-red",
  Média: "pill pill-yellow",
  Baixa: "pill pill-blue",
};

export function ehDificuldade(
  valor: string | null | undefined,
): valor is Dificuldade {
  return !!valor && (DIFICULDADES as readonly string[]).includes(valor);
}

export function ehConcluido(status: string | null | undefined): boolean {
  return status === STATUS_CONCLUIDO;
}

/** Cor de texto legível (preto/branco) sobre um fundo hex. */
export function corTextoSobre(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#fff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Luminância relativa aproximada.
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#1a1a1a" : "#fff";
}

/** Data de hoje no formato YYYY-MM-DD, no fuso de São Paulo. */
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

/** Não concluída e com o prazo de entrega já passado. */
export function estaAtrasada(
  d: Pick<Demanda, "status" | "data_entrega">,
  hoje: string,
): boolean {
  return !ehConcluido(d.status) && !!d.data_entrega && d.data_entrega < hoje;
}
