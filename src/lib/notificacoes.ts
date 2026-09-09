/**
 * Tipos e rótulos das notificações — client-safe (sem import de servidor).
 * As consultas ao banco ficam em `notificacoes-consultas.ts` (server-only).
 */

export type TipoNotificacao = "comentario" | "status" | "edicao";

export type Notificacao = {
  id: string;
  usuario_id: string;
  demanda_id: string | null;
  tipo: TipoNotificacao;
  descricao: string;
  lida: boolean;
  criado_em: string;
};

export const ROTULO_TIPO_NOTIFICACAO: Record<TipoNotificacao, string> = {
  comentario: "Comentário",
  status: "Status",
  edicao: "Edição",
};
