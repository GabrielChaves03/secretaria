import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * QR code da instância do gateway padrão (Evolution API) — usado pela página
 * pública `/conectar-whatsapp?t=...` para outra pessoa parear o número.
 *
 * A `apikey` do servidor nunca sai daqui: o navegador só recebe o QR e o
 * estado da conexão. Acesso protegido por `WHATSAPP_QR_SEGREDO` (vai no link
 * compartilhado); sem ele configurado, a rota fica desligada.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.WHATSAPP_QR_SEGREDO;
  if (!segredo || request.nextUrl.searchParams.get("t") !== segredo) {
    return NextResponse.json({ erro: "Link inválido." }, { status: 401 });
  }

  const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
  const apikey = process.env.WHATSAPP_GATEWAY_TOKEN;
  if (!gatewayUrl || !apikey) {
    return NextResponse.json({ erro: "Gateway não configurado." }, { status: 500 });
  }

  // .../message/sendText/{instancia} → base do servidor + nome da instância
  const url = new URL(gatewayUrl);
  const instancia = url.pathname.split("/").filter(Boolean).pop();
  const base = url.origin;
  const cab = { apikey };

  try {
    const estadoRes = await fetch(`${base}/instance/connectionState/${instancia}`, {
      headers: cab,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const estado = (await estadoRes.json())?.instance?.state ?? "desconhecido";
    if (estado === "open") return NextResponse.json({ estado });

    // Só pede QR novo quando a página pede (a cada ~15 s).
    if (request.nextUrl.searchParams.get("qr") !== "1") {
      return NextResponse.json({ estado });
    }

    const qrRes = await fetch(`${base}/instance/connect/${instancia}`, {
      headers: cab,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const qr = await qrRes.json();
    const base64: string | undefined = qr?.base64;
    return NextResponse.json({
      estado,
      qr: base64
        ? base64.startsWith("data:")
          ? base64
          : `data:image/png;base64,${base64}`
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
