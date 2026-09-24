import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/manychat/cron-auth";
import { processarAvisosAgendados } from "@/lib/whatsapp-agendados";

export const maxDuration = 60;

/**
 * Batido pelo pg_cron do Supabase a cada 5 min (migration 0016) — envia os
 * avisos de prazo e os lembretes de compromisso pelo WhatsApp.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const resumo = await processarAvisosAgendados(request.nextUrl.origin);
    return NextResponse.json(resumo);
  } catch (e) {
    console.error("[whatsapp] cron:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
