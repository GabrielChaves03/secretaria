"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Sai do escritório atual. Volta pro onboarding.
 */
export async function sairEscritorio(): Promise<{ erro: string } | void> {
  await requererUsuario();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("sair_do_escritorio");
  if (error) return { erro: error.message.replace(/^ERROR:\s*/i, "") };

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

/**
 * Gera um código novo para o escritório (só chefe).
 */
export async function regenerarCodigo(): Promise<void> {
  await requererUsuario();
  const supabase = await criarClienteServidor();
  await supabase.rpc("regenerar_codigo");
  revalidatePath("/escritorio");
}

/**
 * Promove/rebaixa um membro (só chefe).
 */
export async function definirPapelMembro(formData: FormData): Promise<void> {
  await requererUsuario();
  const usuario = String(formData.get("usuario") ?? "");
  const papel = String(formData.get("papel") ?? "");
  if (!usuario || !papel) return;

  const supabase = await criarClienteServidor();
  await supabase.rpc("definir_papel_membro", {
    p_usuario: usuario,
    p_papel: papel,
  });
  revalidatePath("/escritorio");
}

/**
 * Remove um membro do escritório (só chefe). A pessoa fica sem escritório.
 */
export async function removerMembro(formData: FormData): Promise<void> {
  await requererUsuario();
  const usuario = String(formData.get("usuario") ?? "");
  if (!usuario) return;

  const supabase = await criarClienteServidor();
  await supabase.rpc("remover_membro", { p_usuario: usuario });
  revalidatePath("/escritorio");
}
