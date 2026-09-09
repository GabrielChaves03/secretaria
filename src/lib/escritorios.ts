/**
 * Tipos do escritório — client-safe (sem import de servidor).
 * As consultas ao banco ficam em `escritorios-consultas.ts` (server-only).
 */

import type { Papel } from "@/lib/demandas";

export type Escritorio = {
  id: string;
  nome: string;
  codigo: string;
  criado_por: string | null;
  criado_em: string;
};

/** Membro do escritório (linha de `usuarios` visível para o chefe). */
export type Membro = {
  id: string;
  nome: string | null;
  telefone: string | null;
  papel: Papel;
};
