/**
 * Tipos e helpers de "conta Instagram conectada" (ManyChat) — client-safe,
 * sem import de servidor. Consultas em `manychat-contas-consultas.ts`
 * (server-only, sessão do usuário + RLS — não confundir com
 * `lib/manychat/instagram-accounts.ts`, que é o motor via service role).
 */

export type ContaInstagram = {
  id: string;
  escritorio_id: string;
  ig_user_id: string;
  ig_username: string | null;
  ig_profile_picture_url: string | null;
  access_token: string;
  token_expires_at: string | null;
  connected_at: string;
  updated_at: string;
};

const FUSO = "America/Sao_Paulo";

export function formatarDataHoraBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
