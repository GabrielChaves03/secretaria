"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { obterPerfil } from "@/lib/perfil-consultas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { novoIdPlanilha, type ColunaPlanilha, type TipoColunaPlanilha } from "@/lib/planilha";

async function proximaOrdemLinha(quadroId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("planilha_linhas")
    .select("ordem")
    .eq("quadro_id", quadroId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.ordem as number | undefined) ?? -1) + 1;
}

/** Adiciona uma linha vazia no fim da planilha. */
export async function adicionarLinha(quadroId: string) {
  await requererUsuario();
  if (!quadroId) return;
  const supabase = await criarClienteServidor();
  await supabase.from("planilha_linhas").insert({
    quadro_id: quadroId,
    valores: {},
    ordem: await proximaOrdemLinha(quadroId),
  });
  revalidatePath(`/dashboard/planilha/${quadroId}`);
}

/** Salva os valores de uma linha (objeto { colunaId: valor }). */
export async function salvarLinha(
  linhaId: string,
  valores: Record<string, string>,
) {
  await requererUsuario();
  if (!linhaId) return;
  const supabase = await criarClienteServidor();
  await supabase.from("planilha_linhas").update({ valores }).eq("id", linhaId);
}

export async function apagarLinha(linhaId: string, quadroId: string) {
  await requererUsuario();
  if (!linhaId) return;
  const supabase = await criarClienteServidor();
  await supabase.from("planilha_linhas").delete().eq("id", linhaId);
  revalidatePath(`/dashboard/planilha/${quadroId}`);
}

/** Adiciona uma coluna à planilha (só o chefe). */
export async function adicionarColuna(
  quadroId: string,
  nome: string,
  tipo: TipoColunaPlanilha,
) {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (perfil.papel !== "chefe") return;
  const n = nome.trim();
  if (!quadroId || !n) return;

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("quadros")
    .select("planilha_colunas")
    .eq("id", quadroId)
    .maybeSingle();
  const colunas = ((data?.planilha_colunas as ColunaPlanilha[] | null) ?? []).filter(
    Boolean,
  );
  colunas.push({ id: novoIdPlanilha("c"), nome: n, tipo });

  await supabase.from("quadros").update({ planilha_colunas: colunas }).eq("id", quadroId);
  revalidatePath(`/dashboard/planilha/${quadroId}`);
}

/** Renomeia uma coluna da planilha (só o chefe). */
export async function renomearColuna(quadroId: string, colunaId: string, nome: string) {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (perfil.papel !== "chefe") return;
  const n = nome.trim();
  if (!quadroId || !colunaId || !n) return;

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("quadros")
    .select("planilha_colunas")
    .eq("id", quadroId)
    .maybeSingle();
  const colunas = ((data?.planilha_colunas as ColunaPlanilha[] | null) ?? []).filter(Boolean);
  const prox = colunas.map((c) => (c.id === colunaId ? { ...c, nome: n } : c));

  await supabase.from("quadros").update({ planilha_colunas: prox }).eq("id", quadroId);
  revalidatePath(`/dashboard/planilha/${quadroId}`);
}

/** Apaga uma coluna da planilha e remove o valor dela das linhas (só o chefe). */
export async function apagarColuna(quadroId: string, colunaId: string) {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (perfil.papel !== "chefe") return;
  if (!quadroId || !colunaId) return;

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("quadros")
    .select("planilha_colunas")
    .eq("id", quadroId)
    .maybeSingle();
  const colunas = ((data?.planilha_colunas as ColunaPlanilha[] | null) ?? []).filter(Boolean);
  await supabase
    .from("quadros")
    .update({ planilha_colunas: colunas.filter((c) => c.id !== colunaId) })
    .eq("id", quadroId);

  revalidatePath(`/dashboard/planilha/${quadroId}`);
}
