"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoFormulario = { erro: string } | undefined;

/**
 * Login com e-mail + senha. Em sucesso, redireciona para `/dashboard`.
 */
export async function entrar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { erro: "E-mail ou senha inválidos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Cadastro com e-mail + senha. `nome` e `telefone` vão nos metadados do
 * usuário e a trigger `handle_new_user` cria a linha em `public.usuarios`.
 *
 * Se o projeto Supabase exigir confirmação de e-mail, não há sessão na
 * volta: mandamos o usuário para `/login` com um aviso.
 */
export async function cadastrar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nome || !email) {
    return { erro: "Preencha nome e e-mail." };
  }
  if (senha.length < 8) {
    return { erro: "A senha precisa ter ao menos 8 caracteres." };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome, telefone } },
  });

  if (error) {
    return { erro: error.message };
  }

  if (!data.session) {
    redirect("/login?confirmar=1");
  }

  revalidatePath("/", "layout");
  // Conta nova ainda não tem escritório: vai escolher/criar um.
  redirect("/onboarding");
}

/**
 * Encerra a sessão e volta para `/login`.
 */
export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
