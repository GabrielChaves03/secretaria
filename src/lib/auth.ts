import "server-only";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Camada única de checagem de sessão no servidor.
 *
 * Retorna o usuário autenticado ou redireciona para `/login`.
 * Use em toda página/ação que exige login — nunca confie só no `proxy`.
 */
export async function requererUsuario() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
