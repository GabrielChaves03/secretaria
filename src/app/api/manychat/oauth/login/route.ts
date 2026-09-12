import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { obterOrigem } from "@/lib/origem";
import { buildAuthorizeUrl } from "@/lib/manychat/instagram";

export async function GET() {
  // Precisa estar logado e ter escritório — é a conta do escritório que
  // vamos conectar ao Instagram.
  await requererEscritorio();

  const state = randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const origem = await obterOrigem();
  const redirectUri = `${origem}/api/manychat/oauth/callback`;

  return NextResponse.redirect(buildAuthorizeUrl(state, redirectUri));
}
