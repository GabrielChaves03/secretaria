import "server-only";

import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel } from "@/lib/demandas";

export type Perfil = {
  id: string;
  email: string;
  nome: string | null;
  papel: Papel;
};

/**
 * Perfil do usuário logado (id, e-mail, nome e papel). Também serve de guarda
 * de sessão — chama `requererUsuario()` por baixo.
 */
export async function obterPerfil(): Promise<Perfil> {
  const usuario = await requererUsuario();
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("usuarios")
    .select("nome, papel")
    .eq("id", usuario.id)
    .maybeSingle();

  return {
    id: usuario.id,
    email: usuario.email ?? "",
    nome: (data?.nome as string | null) ?? null,
    papel: (data?.papel as Papel | undefined) ?? "funcionario",
  };
}
