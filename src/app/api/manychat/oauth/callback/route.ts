import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { obterOrigem } from "@/lib/origem";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getProfile,
  subscribeWebhooks,
} from "@/lib/manychat/instagram";
import { conectarContaInstagram } from "@/lib/manychat-contas-consultas";

export async function GET(request: NextRequest) {
  // O redirect da Meta volta pro nosso domínio numa navegação normal do
  // navegador — o cookie de sessão do Secretária já está presente aqui.
  const perfil = await requererEscritorio();

  const origem = await obterOrigem();
  const searchParams = request.nextUrl.searchParams;

  const erroMeta = searchParams.get("error");
  if (erroMeta) {
    const descricao = searchParams.get("error_description") ?? erroMeta;
    return NextResponse.redirect(`${origem}/manychat?erro=${encodeURIComponent(descricao)}`);
  }

  const code = searchParams.get("code")?.replace(/#_$/, "");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const estadoEsperado = cookieStore.get("ig_oauth_state")?.value;
  cookieStore.delete("ig_oauth_state");

  if (!code || !state || !estadoEsperado || state !== estadoEsperado) {
    return NextResponse.redirect(
      `${origem}/manychat?erro=${encodeURIComponent("Sessão de login inválida ou expirada. Tente novamente.")}`,
    );
  }

  try {
    const redirectUri = `${origem}/api/manychat/oauth/callback`;
    const tokenCurto = await exchangeCodeForShortLivedToken(code, redirectUri);
    const tokenLongo = await exchangeForLongLivedToken(tokenCurto.access_token);
    const perfilInstagram = await getProfile(tokenLongo.access_token);

    const expiraEm = new Date(Date.now() + tokenLongo.expires_in * 1000).toISOString();

    const conta = await conectarContaInstagram({
      escritorioId: perfil.escritorioId!,
      igUserId: perfilInstagram.user_id,
      igUsername: perfilInstagram.username,
      igProfilePictureUrl: perfilInstagram.profile_picture_url ?? null,
      accessToken: tokenLongo.access_token,
      tokenExpiresAt: expiraEm,
    });

    await subscribeWebhooks(perfilInstagram.user_id, tokenLongo.access_token);

    return NextResponse.redirect(`${origem}/manychat/contas/${conta.id}?conectado=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.redirect(`${origem}/manychat?erro=${encodeURIComponent(message)}`);
  }
}
