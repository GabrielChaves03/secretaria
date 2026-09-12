import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/manychat/cron-auth";
import { refreshLongLivedToken } from "@/lib/manychat/instagram";
import { listAllAccounts, updateAccountToken } from "@/lib/manychat/instagram-accounts";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const accounts = await listAllAccounts();
  if (accounts.length === 0) {
    return NextResponse.json({ refreshed: 0, reason: "nenhuma_conta_conectada" });
  }

  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        const refreshed = await refreshLongLivedToken(account.access_token);
        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        await updateAccountToken(account.id, refreshed.access_token, expiresAt);
        return { account_id: account.id, ig_username: account.ig_username, refreshed: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        return { account_id: account.id, ig_username: account.ig_username, refreshed: false, error: message };
      }
    }),
  );

  return NextResponse.json({ refreshed: results.filter((r) => r.refreshed).length, results });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
