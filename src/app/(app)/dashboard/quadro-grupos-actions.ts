"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { obterPerfil } from "@/lib/perfil-consultas";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Grupos (seções) de um quadro vivem no próprio quadro. Só o chefe mexe. */
async function exigirChefe() {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (perfil.papel !== "chefe") throw new Error("Só o chefe pode fazer isso.");
}

type GruposQuadro = {
  grupos_ordem: string[];
  grupos_cores: Record<string, string>;
  primeiro_grupo: string;
};

async function lerGrupos(quadroId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("quadros")
    .select("grupos_ordem, grupos_cores, primeiro_grupo")
    .eq("id", quadroId)
    .maybeSingle();
  return {
    supabase,
    grupos: (data as GruposQuadro | null) ?? {
      grupos_ordem: [],
      grupos_cores: {},
      primeiro_grupo: "Tarefas pendentes",
    },
  };
}

export async function adicionarGrupo(quadroId: string, nome: string, cor: string) {
  await exigirChefe();
  const n = nome.trim();
  if (!quadroId || !n) return;
  const { supabase, grupos } = await lerGrupos(quadroId);
  if (grupos.grupos_ordem.includes(n) || n === grupos.primeiro_grupo) return;

  await supabase
    .from("quadros")
    .update({
      grupos_ordem: [...grupos.grupos_ordem, n],
      grupos_cores: { ...grupos.grupos_cores, [n]: cor },
    })
    .eq("id", quadroId);

  revalidatePath(`/dashboard/quadro/${quadroId}`);
}

export async function renomearGrupo(quadroId: string, antigo: string, novo: string) {
  await exigirChefe();
  const n = novo.trim();
  if (!quadroId || !n || n === antigo) return;
  const { supabase, grupos } = await lerGrupos(quadroId);

  const ordem = grupos.grupos_ordem.map((g) => (g === antigo ? n : g));
  const cores = { ...grupos.grupos_cores };
  if (cores[antigo] !== undefined) {
    cores[n] = cores[antigo];
    delete cores[antigo];
  }
  const ehPrimeiro = grupos.primeiro_grupo === antigo;

  await supabase
    .from("quadros")
    .update({
      grupos_ordem: ordem,
      grupos_cores: cores,
      ...(ehPrimeiro ? { primeiro_grupo: n } : {}),
    })
    .eq("id", quadroId);

  // Move as demandas do grupo antigo para o novo nome.
  await supabase
    .from("demandas")
    .update({ grupo: n })
    .eq("quadro_id", quadroId)
    .eq("grupo", antigo);

  revalidatePath(`/dashboard/quadro/${quadroId}`);
}

export async function apagarGrupo(quadroId: string, nome: string) {
  await exigirChefe();
  if (!quadroId || !nome) return;
  const { supabase, grupos } = await lerGrupos(quadroId);
  if (nome === grupos.primeiro_grupo) return; // não apaga o grupo padrão

  const cores = { ...grupos.grupos_cores };
  delete cores[nome];

  await supabase
    .from("quadros")
    .update({
      grupos_ordem: grupos.grupos_ordem.filter((g) => g !== nome),
      grupos_cores: cores,
    })
    .eq("id", quadroId);

  // As demandas do grupo voltam para o grupo padrão.
  await supabase
    .from("demandas")
    .update({ grupo: grupos.primeiro_grupo })
    .eq("quadro_id", quadroId)
    .eq("grupo", nome);

  revalidatePath(`/dashboard/quadro/${quadroId}`);
}

export async function corGrupo(quadroId: string, nome: string, cor: string) {
  await exigirChefe();
  if (!quadroId || !nome) return;
  const { supabase, grupos } = await lerGrupos(quadroId);
  await supabase
    .from("quadros")
    .update({ grupos_cores: { ...grupos.grupos_cores, [nome]: cor } })
    .eq("id", quadroId);
  revalidatePath(`/dashboard/quadro/${quadroId}`);
}

/** Troca o grupo de uma demanda (arrastar entre grupos na Tabela). */
export async function moverDemandaGrupo(demandaId: string, grupo: string) {
  await requererUsuario();
  if (!demandaId || !grupo) return;
  const supabase = await criarClienteServidor();
  await supabase.from("demandas").update({ grupo }).eq("id", demandaId);
  revalidatePath("/dashboard", "layout");
}
