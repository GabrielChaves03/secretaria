import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";

export type Comentario = {
  id: string;
  demanda_id: string;
  usuario_id: string;
  texto: string;
  autor_nome: string | null;
  criado_em: string;
};

/**
 * Lista os comentários de uma demanda, do mais recente para o mais antigo.
 * A RLS garante que só voltam comentários de demandas que o usuário pode ver.
 */
export async function listarComentarios(
  demandaId: string,
): Promise<Comentario[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("comentarios")
    .select("*")
    .eq("demanda_id", demandaId)
    .order("criado_em", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Comentario[];
}

/**
 * Busca os comentários de várias demandas de uma vez, agrupados por
 * `demanda_id` (mais recente primeiro). Evita N+1 na listagem do dashboard.
 */
export async function listarComentariosPorDemanda(
  demandaIds: string[],
): Promise<Map<string, Comentario[]>> {
  const mapa = new Map<string, Comentario[]>();
  if (demandaIds.length === 0) return mapa;

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("comentarios")
    .select("*")
    .in("demanda_id", demandaIds)
    .order("criado_em", { ascending: false });

  if (error) throw error;

  for (const c of (data ?? []) as Comentario[]) {
    const lista = mapa.get(c.demanda_id) ?? [];
    lista.push(c);
    mapa.set(c.demanda_id, lista);
  }

  return mapa;
}
