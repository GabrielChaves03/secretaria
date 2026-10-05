"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requererUsuario } from "@/lib/auth";
import { obterPerfil } from "@/lib/perfil-consultas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterQuadro } from "@/lib/operacoes-consultas";

/** Só o chefe mexe na estrutura de operações/quadros (a RLS também barra). */
async function exigirChefe() {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (perfil.papel !== "chefe") throw new Error("Só o chefe pode fazer isso.");
  return perfil;
}

/** Próxima `ordem` (no fim) de uma coleção, opcionalmente dentro de um pai. */
async function proximaOrdem(
  tabela: "operacoes" | "quadros",
  filtro?: { coluna: string; valor: string },
) {
  const supabase = await criarClienteServidor();
  let q = supabase.from(tabela).select("ordem").order("ordem", { ascending: false }).limit(1);
  if (filtro) q = q.eq(filtro.coluna, filtro.valor);
  const { data } = await q.maybeSingle();
  return ((data?.ordem as number | undefined) ?? -1) + 1;
}

// ─────────────────────────── Operações ───────────────────────────

export async function criarOperacao(formData: FormData) {
  await exigirChefe();
  const nome = String(formData.get("nome") ?? "").trim();
  const cor = String(formData.get("cor") ?? "#579BFC").trim();
  if (!nome) return;

  const supabase = await criarClienteServidor();
  await supabase
    .from("operacoes")
    .insert({ nome, cor, ordem: await proximaOrdem("operacoes") });

  revalidatePath("/dashboard", "layout");
}

export async function editarOperacao(formData: FormData) {
  await exigirChefe();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const cor = String(formData.get("cor") ?? "").trim();
  if (!id || !nome) return;

  const supabase = await criarClienteServidor();
  await supabase.from("operacoes").update({ nome, cor }).eq("id", id);

  revalidatePath("/dashboard", "layout");
}

export async function apagarOperacao(formData: FormData) {
  await exigirChefe();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await criarClienteServidor();
  // Cascata no banco apaga os quadros e as demandas dentro.
  await supabase.from("operacoes").delete().eq("id", id);

  revalidatePath("/dashboard", "layout");
}

// ──────────────────────────── Quadros ────────────────────────────

export async function criarQuadro(formData: FormData) {
  await exigirChefe();
  const operacaoId = String(formData.get("operacao_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const cor = String(formData.get("cor") ?? "#579BFC").trim();
  const tipo = String(formData.get("tipo") ?? "tarefas") === "anotacoes" ? "anotacoes" : "tarefas";
  if (!operacaoId || !nome) return;

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("quadros")
    .insert({
      operacao_id: operacaoId,
      nome,
      cor,
      tipo,
      ordem: await proximaOrdem("quadros", { coluna: "operacao_id", valor: operacaoId }),
    })
    .select("id")
    .single();

  revalidatePath("/dashboard", "layout");
  if (data?.id) redirect(`/dashboard/quadro/${data.id}`);
}

export async function editarQuadro(formData: FormData) {
  await exigirChefe();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const cor = String(formData.get("cor") ?? "").trim();
  if (!id || !nome) return;

  const supabase = await criarClienteServidor();
  await supabase.from("quadros").update({ nome, cor }).eq("id", id);

  revalidatePath("/dashboard", "layout");
}

export async function apagarQuadro(formData: FormData) {
  await exigirChefe();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await criarClienteServidor();
  await supabase.from("quadros").delete().eq("id", id);

  revalidatePath("/dashboard", "layout");
}

/** Troca a ordem de um quadro com o vizinho (dir: -1 sobe, +1 desce). */
export async function moverQuadro(id: string, dir: -1 | 1) {
  await exigirChefe();
  const alvo = await obterQuadro(id);
  if (!alvo) return;

  const supabase = await criarClienteServidor();
  const { data: irmaos } = await supabase
    .from("quadros")
    .select("id, ordem")
    .eq("operacao_id", alvo.operacao_id)
    .order("ordem")
    .order("criado_em");

  const lista = (irmaos ?? []) as { id: string; ordem: number }[];
  const i = lista.findIndex((q) => q.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= lista.length) return;

  // Reatribui ordens sequenciais depois de trocar os dois.
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await Promise.all(
    lista.map((q, idx) =>
      supabase.from("quadros").update({ ordem: idx }).eq("id", q.id),
    ),
  );

  revalidatePath("/dashboard", "layout");
}
