/**
 * Tipos, constantes e rótulos das demandas.
 *
 * Este módulo não importa nada de servidor de propósito: é usado tanto por
 * Server Components/Actions quanto pelo formulário (Client Component). As
 * consultas ao banco ficam em `demandas-consultas.ts` (server-only).
 */

export const DIFICULDADES = ["facil", "media", "dificil"] as const;
export const STATUS = ["pendente", "em_andamento", "concluida"] as const;
export const PAPEIS = ["funcionario", "chefe"] as const;

export type Dificuldade = (typeof DIFICULDADES)[number];
export type Status = (typeof STATUS)[number];
export type Papel = (typeof PAPEIS)[number];

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
  status: Status;
  /** Lista personalizada do quadro; `null` = colunas automáticas por status/prazo. */
  lista_id: string | null;
  /** Quadro (board) a que a demanda pertence; `null` = legado sem quadro. */
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

export const ROTULO_STATUS: Record<Status, string> = {
  pendente: "A iniciar",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

/** Classe da pílula (ver globals.css) por status. */
export const PILL_STATUS: Record<Status, string> = {
  pendente: "pill pill-blue",
  em_andamento: "pill pill-yellow",
  concluida: "pill pill-green",
};

/** Classe da pílula por dificuldade — verde/amarelo/vermelho. */
export const PILL_DIFICULDADE: Record<Dificuldade, string> = {
  facil: "pill pill-green",
  media: "pill pill-yellow",
  dificil: "pill pill-red",
};

export function ehStatus(valor: string | null | undefined): valor is Status {
  return !!valor && (STATUS as readonly string[]).includes(valor);
}

export function ehDificuldade(
  valor: string | null | undefined,
): valor is Dificuldade {
  return !!valor && (DIFICULDADES as readonly string[]).includes(valor);
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
  return d.status !== "concluida" && !!d.data_entrega && d.data_entrega < hoje;
}

export type ChaveAuto = "a_iniciar" | "em_andamento" | "concluida" | "atrasada";

/**
 * Coluna automática de uma demanda no quadro:
 * - Concluídas: status "concluida";
 * - Pendentes (atrasada): não concluída e com prazo vencido;
 * - A iniciar: status "pendente" dentro do prazo;
 * - Em andamento: status "em_andamento" dentro do prazo.
 */
export function colunaAutoDe(
  d: Pick<Demanda, "status" | "data_entrega">,
  hoje: string,
): ChaveAuto {
  if (d.status === "concluida") return "concluida";
  if (d.data_entrega && d.data_entrega < hoje) return "atrasada";
  if (d.status === "pendente") return "a_iniciar";
  return "em_andamento";
}
