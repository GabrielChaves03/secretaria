import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role key — ignora RLS por completo. Dois usos
 * legítimos:
 * 1. Motor do ManyChat (webhook/drenador/cron em `src/lib/manychat/`), que
 *    roda sem sessão de usuário nenhuma (é a Meta ou o pg_cron batendo no
 *    servidor).
 * 2. Fila global do Editor de Vídeos (`src/lib/video-pedidos-consultas.ts` e
 *    `src/app/editor-de-videos/actions.ts`) — aqui HÁ sessão de usuário, mas
 *    o admin precisa enxergar/editar pedidos de TODOS os escritórios de
 *    propósito, então a checagem de permissão é feita no código (`ehAdmin()`
 *    em `@/lib/admin`) antes de usar este cliente, não pela RLS.
 * Todo o resto do app (painel, OAuth) usa `criarClienteServidor()` — sessão
 * normal do usuário + RLS. Não importe este arquivo em outro lugar sem um
 * desses dois motivos.
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
