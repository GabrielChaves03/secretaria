/**
 * Tipo da lista personalizada do quadro — client-safe (sem import de servidor).
 * As consultas ao banco ficam em `listas-consultas.ts` (server-only).
 */

export type Lista = {
  id: string;
  usuario_id: string;
  nome: string;
  ordem: number;
  criado_em: string;
};
