import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Lista } from "@/lib/listas";

export type { Lista } from "@/lib/listas";

/**
 * Listas visíveis para o usuário logado (as próprias; o chefe vê as de todos).
 * A RLS decide o recorte. Ordenadas por `ordem` e, no empate, pela criação.
 * `donoId` restringe às listas de uma pessoa (quadro pessoal do chefe).
 */
export async function listarListas(donoId?: string): Promise<Lista[]> {
  const supabase = await criarClienteServidor();

  let consulta = supabase
    .from("listas")
    .select("*")
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });
  if (donoId) consulta = consulta.eq("usuario_id", donoId);

  const { data, error } = await consulta;

  if (error) throw error;

  return (data ?? []) as Lista[];
}
