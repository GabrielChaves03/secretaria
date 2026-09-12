import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Automacao } from "@/lib/manychat-automacoes";

export async function listarAutomacoes(contaId: string): Promise<Automacao[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("instagram_account_id", contaId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Automacao[];
}

export async function obterAutomacao(id: string): Promise<Automacao | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return (data as Automacao | null) ?? null;
}
