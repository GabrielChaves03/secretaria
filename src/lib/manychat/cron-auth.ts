import "server-only";
import type { NextRequest } from "next/server";

/**
 * Os endpoints de cron são públicos na internet (pg_net do Supabase bate
 * neles por HTTP). Exigimos um segredo compartilhado para que ninguém mais
 * consiga forçar envios ou renovar o token.
 */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided =
    request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-cron-secret");

  return provided === secret;
}
