import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { verifySignature } from "@/lib/manychat/webhook-signature";
import { processWebhookEntry, type WebhookEntry } from "@/lib/manychat/webhook-processing";
import { drainQueue } from "@/lib/manychat/drain";

// Handshake de verificação exigido pela Meta ao cadastrar o webhook.
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Falha na verificação do webhook" }, { status: 403 });
}

// Eventos reais: comentários e mensagens.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appSecret || !verifySignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let body: { object?: string; entry?: WebhookEntry[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    try {
      await processWebhookEntry(entry);
    } catch (err) {
      console.error("Falha ao processar evento do webhook:", err);
    }
  }

  // Dispara a drenagem imediatamente após responder, pra o envio parecer
  // instantâneo. O pg_cron (/api/manychat/cron/drain) cobre o caso de essa
  // chamada falhar/não rodar.
  after(() => {
    drainQueue().catch((err) => console.error("Falha ao drenar fila após webhook:", err));
  });

  return NextResponse.json({ received: true });
}
