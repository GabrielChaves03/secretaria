import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Compromisso } from "@/lib/compromissos";

/**
 * Lista os compromissos visíveis pro usuário logado (RLS: dono vê os
 * próprios, chefe vê todos do escritório), do mais próximo pro mais distante.
 */
export async function listarCompromissos(): Promise<Compromisso[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("compromissos")
    .select("*")
    .order("data_hora", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Compromisso[];
}
