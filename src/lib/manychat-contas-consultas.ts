import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { ContaInstagram } from "@/lib/manychat-contas";

/**
 * Contas Instagram conectadas — sessão normal do usuário + RLS (a RLS já
 * escopa por escritório). Diferente de `lib/manychat/instagram-accounts.ts`
 * (motor, service role, enxerga todos os escritórios).
 */
export async function listarContas(): Promise<ContaInstagram[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("connected_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as ContaInstagram[];
}

export async function obterConta(id: string): Promise<ContaInstagram | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return (data as ContaInstagram | null) ?? null;
}

/**
 * Chamado no callback do OAuth (sessão do usuário já presente — é uma
 * navegação de volta pro nosso domínio depois do redirect da Meta). Se já
 * existe uma conta com esse `ig_user_id` em OUTRO escritório, o `upsert`
 * falha sozinho por violar a RLS de UPDATE (Postgres exige que a policy
 * passe pra resolver o conflito de `ON CONFLICT DO UPDATE`) — não precisa de
 * checagem manual extra aqui, só propagar o erro com uma mensagem clara.
 */
export async function conectarContaInstagram(input: {
  escritorioId: string;
  igUserId: string;
  igUsername: string;
  igProfilePictureUrl: string | null;
  accessToken: string;
  tokenExpiresAt: string;
}): Promise<ContaInstagram> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("instagram_accounts")
    .upsert(
      {
        escritorio_id: input.escritorioId,
        ig_user_id: input.igUserId,
        ig_username: input.igUsername,
        ig_profile_picture_url: input.igProfilePictureUrl,
        access_token: input.accessToken,
        token_expires_at: input.tokenExpiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ig_user_id" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      error?.code === "42501" || error?.message?.includes("row-level security")
        ? "Essa conta do Instagram já está conectada em outro escritório."
        : (error?.message ?? "Falha ao salvar a conta."),
    );
  }

  return data as ContaInstagram;
}
