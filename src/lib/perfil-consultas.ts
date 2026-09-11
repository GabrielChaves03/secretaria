import "server-only";

import { redirect } from "next/navigation";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel } from "@/lib/demandas";

export type Perfil = {
  id: string;
  email: string;
  nome: string | null;
  telefone: string | null;
  papel: Papel;
  /** Escritório ao qual o usuário pertence; `null` = ainda não escolheu (onboarding). */
  escritorioId: string | null;
  /** Preferência pessoal: receber avisos no WhatsApp. */
  whatsappAtivo: boolean;
  /** Chave da imagem de fundo escolhida em /ajustes; `null` = padrão. */
  imagemFundo: string | null;
};

/**
 * Perfil do usuário logado (id, e-mail, nome, papel e escritório). Também serve
 * de guarda de sessão — chama `requererUsuario()` por baixo.
 */
export async function obterPerfil(): Promise<Perfil> {
  const usuario = await requererUsuario();
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("usuarios")
    .select("nome, telefone, papel, escritorio_id, whatsapp_ativo, imagem_fundo")
    .eq("id", usuario.id)
    .maybeSingle();

  return {
    id: usuario.id,
    email: usuario.email ?? "",
    nome: (data?.nome as string | null) ?? null,
    telefone: (data?.telefone as string | null) ?? null,
    papel: (data?.papel as Papel | undefined) ?? "funcionario",
    escritorioId: (data?.escritorio_id as string | null) ?? null,
    whatsappAtivo: (data?.whatsapp_ativo as boolean | undefined) ?? true,
    imagemFundo: (data?.imagem_fundo as string | null) ?? null,
  };
}

/**
 * Igual a `obterPerfil()`, mas exige que o usuário já pertença a um escritório —
 * se não pertencer, manda para `/onboarding`. Use nas páginas/ações da área logada.
 */
export async function requererEscritorio(): Promise<Perfil> {
  const perfil = await obterPerfil();
  if (!perfil.escritorioId) {
    redirect("/onboarding");
  }
  return perfil;
}
