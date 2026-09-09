import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Escritorio, Membro } from "@/lib/escritorios";

export type { Escritorio, Membro } from "@/lib/escritorios";

/**
 * O escritório do usuário logado. A RLS só devolve o próprio — retorna `null`
 * se a pessoa ainda não pertence a nenhum.
 */
export async function obterEscritorio(): Promise<Escritorio | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("escritorios")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return (data as Escritorio | null) ?? null;
}

/**
 * Membros do escritório. Só o chefe enxerga os colegas (RLS de `usuarios`);
 * um funcionário recebe apenas a própria linha.
 */
export async function listarMembros(): Promise<Membro[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, telefone, papel")
    .not("escritorio_id", "is", null)
    .order("papel", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Membro[];
}
