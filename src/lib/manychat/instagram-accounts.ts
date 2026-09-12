import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Acesso a `instagram_accounts` pelo MOTOR (webhook/drenador/cron) — via
 * service role, sem sessão de usuário, então precisa enxergar contas de
 * QUALQUER escritório (o webhook não sabe de antemão de qual tenant é o
 * evento; resolve isso justamente perguntando "de quem é esse ig_user_id").
 * O painel (CRUD visível ao usuário) usa `manychat-contas-consultas.ts`,
 * escopado por escritório via RLS — não este arquivo.
 */
export type ContaInstagramMotor = {
  id: string;
  escritorio_id: string;
  ig_user_id: string;
  ig_username: string | null;
  access_token: string;
};

export async function getAccountByIgUserId(igUserId: string): Promise<ContaInstagramMotor | null> {
  const { data, error } = await supabaseAdmin()
    .from("instagram_accounts")
    .select("id, escritorio_id, ig_user_id, ig_username, access_token")
    .eq("ig_user_id", igUserId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar conta: ${error.message}`);
  return data;
}

/** Todas as contas conectadas, de todos os escritórios — usado só pelo cron de renovação de token. */
export async function listAllAccounts(): Promise<
  Array<{ id: string; ig_username: string | null; access_token: string }>
> {
  const { data, error } = await supabaseAdmin()
    .from("instagram_accounts")
    .select("id, ig_username, access_token")
    .order("connected_at", { ascending: true });
  if (error) throw new Error(`Falha ao listar contas: ${error.message}`);
  return data ?? [];
}

export async function updateAccountToken(
  id: string,
  accessToken: string,
  tokenExpiresAt: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("instagram_accounts")
    .update({ access_token: accessToken, token_expires_at: tokenExpiresAt, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao renovar token da conta: ${error.message}`);
}
