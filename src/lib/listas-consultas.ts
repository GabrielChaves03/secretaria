import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Lista } from "@/lib/listas";

export type { Lista } from "@/lib/listas";

/**
 * Listas visíveis para o usuário logado (as próprias; o chefe vê as de todos).
 * A RLS decide o recorte. Ordenadas por `ordem` e, no empate, pela criação.
 */
export async function listarListas(): Promise<Lista[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("listas")
    .select("*")
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Lista[];
}
