import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { ConfigWhatsapp } from "@/lib/whatsapp";

export type { ConfigWhatsapp } from "@/lib/whatsapp";

/**
 * Configuração de WhatsApp do escritório do usuário logado. A RLS só devolve
 * a do próprio escritório — retorna `null` se ainda não foi configurada.
 */
export async function obterConfigWhatsapp(): Promise<ConfigWhatsapp | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("escritorio_whatsapp")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return (data as ConfigWhatsapp | null) ?? null;
}
