import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_DE_AUTH = ["/login", "/cadastro"];

/**
 * Renova a sessão do Supabase a cada requisição e aplica o controle de acesso:
 * - visitante sem sessão tentando `/dashboard` -> redireciona para `/login`
 * - usuário logado tentando `/login` ou `/cadastro` -> redireciona para `/dashboard`
 *
 * Chamado a partir de `src/proxy.ts` (o antigo "middleware" do Next.js).
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaDefinir) {
          cookiesParaDefinir.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          resposta = NextResponse.next({ request });
          cookiesParaDefinir.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: não coloque nenhuma lógica entre criar o cliente e o
  // `getUser()` abaixo — isso pode causar logout aleatório dos usuários.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const rotaProtegida =
    caminho.startsWith("/dashboard") ||
    caminho.startsWith("/calendario") ||
    caminho.startsWith("/onboarding") ||
    caminho.startsWith("/escritorio");
  const rotaDeAuth = ROTAS_DE_AUTH.includes(caminho);

  if (!user && rotaProtegida) {
    return redirecionar(request, "/login", resposta);
  }

  if (user && rotaDeAuth) {
    return redirecionar(request, "/dashboard", resposta);
  }

  return resposta;
}

/**
 * Redireciona preservando os cookies de sessão já renovados em `resposta`.
 */
function redirecionar(
  request: NextRequest,
  destino: string,
  resposta: NextResponse,
) {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  const redirecionamento = NextResponse.redirect(url);
  resposta.cookies.getAll().forEach((cookie) => {
    redirecionamento.cookies.set(cookie);
  });
  return redirecionamento;
}
