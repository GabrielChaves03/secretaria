import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Notificacao } from "@/lib/notificacoes";

export type { Notificacao, TipoNotificacao } from "@/lib/notificacoes";

/** Notificações do usuário logado, mais recentes primeiro (limite 100). */
export async function listarNotificacoes(): Promise<Notificacao[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []) as Notificacao[];
}

/** Quantas notificações não lidas o usuário logado tem. */
export async function contarNaoLidas(): Promise<number> {
  const supabase = await criarClienteServidor();

  const { count, error } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("lida", false);

  if (error) throw error;

  return count ?? 0;
}
