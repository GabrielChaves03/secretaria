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
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

/** Classe da pílula (ver globals.css) por status. */
export const PILL_STATUS: Record<Status, string> = {
  pendente: "pill pill-gray",
  em_andamento: "pill pill-blue",
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
