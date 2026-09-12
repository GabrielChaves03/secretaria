import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role key — ignora RLS por completo. Usado SÓ pelo
 * motor do ManyChat (webhook/drenador/cron em `src/lib/manychat/`), que roda
 * sem sessão de usuário nenhuma (é a Meta ou o pg_cron batendo no servidor).
 * Todo o resto do app (painel, OAuth) usa `criarClienteServidor()` — sessão
 * normal do usuário + RLS. Nunca importe este arquivo fora de `lib/manychat/`
 * ou de rotas de API que realmente não têm sessão de usuário.
 */
function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — o motor do ManyChat (webhook/cron) não funciona sem ela.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let instancia: ReturnType<typeof criarClienteAdmin> | undefined;

/** Singleton preguiçoso — só cria o cliente (e valida a env var) no primeiro uso. */
export function supabaseAdmin() {
  if (!instancia) instancia = criarClienteAdmin();
  return instancia;
}
