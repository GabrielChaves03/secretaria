"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/**
 * Cria um quadro do tipo Tabela (planilha) numa operação, já com as colunas
 * definidas e N linhas em branco. Só o chefe (a RLS também barra).
 */
export async function criarTabela(formData: FormData) {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (perfil.papel !== "chefe") return;

  const operacaoId = String(formData.get("operacao_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const cor = String(formData.get("cor") ?? "#579BFC").trim();
  const linhas = Math.min(500, Math.max(0, Number(formData.get("linhas") ?? 0) || 0));
  let defs: { nome: string; tipo: string }[] = [];
  try {
    defs = JSON.parse(String(formData.get("colunas") ?? "[]"));
  } catch {
    defs = [];
  }
  if (!operacaoId || !nome) return;

  const tiposOk = new Set(["texto", "numero", "link", "select"]);
  const colunas: ColunaPlanilha[] = defs
    .filter((c) => c && c.nome && c.nome.trim())
    .map((c) => ({
      id: novoIdPlanilha("c"),
      nome: c.nome.trim().slice(0, 40),
      tipo: (tiposOk.has(c.tipo) ? c.tipo : "texto") as ColunaPlanilha["tipo"],
    }));

  const supabase = await criarClienteServidor();

  const { data: ult } = await supabase
    .from("quadros")
    .select("ordem")
    .eq("operacao_id", operacaoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = ((ult?.ordem as number | undefined) ?? -1) + 1;

  const { data: novo, error } = await supabase
    .from("quadros")
    .insert({
      operacao_id: operacaoId,
      nome,
      cor,
      tipo: "planilha",
      ordem,
      planilha_colunas: colunas,
    })
    .select("id")
    .single();
  if (error || !novo) return;

  if (linhas > 0) {
    const rows = Array.from({ length: linhas }, (_, i) => ({
      quadro_id: novo.id as string,
      valores: {},
      ordem: i,
    }));
    await supabase.from("planilha_linhas").insert(rows);
  }

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/planilha/${novo.id}`);
}
