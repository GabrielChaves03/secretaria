import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso no servidor (Server Components, Server Actions,
 * Route Handlers). Sincroniza a sessão com os cookies da requisição.
 *
 * É `async` porque `cookies()` passou a ser assíncrono no Next.js 15+.
 */
export async function criarClienteServidor() {
  const armazenamentoCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return armazenamentoCookies.getAll();
        },
        setAll(cookiesParaDefinir) {
          try {
            cookiesParaDefinir.forEach(({ name, value, options }) =>
              armazenamentoCookies.set(name, value, options),
            );
          } catch {
            // `setAll` foi chamado de um Server Component. Pode ser ignorado
            // quando o `proxy` já é responsável por renovar a sessão.
          }
        },
      },
    },
  );
}
