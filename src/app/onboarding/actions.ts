"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoOnboarding = { erro: string } | undefined;

/** Mensagem de erro do Postgres -> texto curto pro usuário. */
function mensagem(bruta: string | undefined): string {
  const m = (bruta ?? "").trim();
  if (!m) return "Não foi possível concluir. Tente de novo.";
  // As funções do banco já lançam mensagens em português e curtas.
  return m.replace(/^ERROR:\s*/i, "");
}

/**
 * Cria um escritório novo e coloca o usuário logado como chefe.
 */
export async function criarEscritorio(
  _anterior: EstadoOnboarding,
  formData: FormData,
): Promise<EstadoOnboarding> {
  await requererUsuario();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do escritório." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("criar_escritorio", { p_nome: nome });
  if (error) return { erro: mensagem(error.message) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Entra num escritório existente pelo código (como funcionário).
 */
export async function entrarEscritorio(
  _anterior: EstadoOnboarding,
  formData: FormData,
): Promise<EstadoOnboarding> {
  await requererUsuario();
  const codigo = String(formData.get("codigo") ?? "")
    .trim()
    .toUpperCase();
  if (!codigo) return { erro: "Informe o código do escritório." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("entrar_no_escritorio", {
    p_codigo: codigo,
  });
  if (error) return { erro: mensagem(error.message) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
