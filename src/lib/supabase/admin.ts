import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role key — ignora RLS por completo. Dois usos
 * legítimos:
 * Único uso hoje: o cron de avisos agendados de WhatsApp
 * (`src/lib/whatsapp-agendados.ts`), batido pelo pg_cron sem sessão de
 * usuário, que precisa varrer demandas/compromissos de todos os escritórios.
 * Todo o resto do app usa `criarClienteServidor()` — sessão normal + RLS.
 */
function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — o cron de avisos de WhatsApp não funciona sem ela.",
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
