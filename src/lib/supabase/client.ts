import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso em Client Components (roda no navegador).
 * Lê a sessão dos cookies gerenciados pelo `@supabase/ssr`.
 */
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
