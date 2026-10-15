"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  IDS_SISTEMA,
  TIPOS_PERSONALIZADOS,
  type ColunaDemanda,
} from "@/lib/demandas-config";

/**
 * Salva as colunas de um quadro de tarefas (nome/ordem/visibilidade das de
 * sistema + as personalizadas). Qualquer membro do escritório pode — a escrita
 * passa pela RPC `salvar_colunas_quadro` (migration 0023).
 */
export async function salvarColunasQuadro(quadroId: string, colunas: ColunaDemanda[]) {
  await requererUsuario();
  if (!quadroId) return { erro: "Quadro inválido." };

  const tiposOk = new Set<string>(TIPOS_PERSONALIZADOS.map((t) => t.tipo));
  const sistema = new Set(IDS_SISTEMA);
  const vistos = new Set<string>();
  const limpas: ColunaDemanda[] = [];

  for (const c of colunas) {
    if (!c?.id || vistos.has(c.id)) continue;
    vistos.add(c.id);
    const ehSistema = sistema.has(c.id);
    const nome = String(c.nome ?? "").trim().slice(0, 40) || "Sem nome";
    if (!ehSistema && !tiposOk.has(c.tipo)) continue;
    const opcoes =
      !ehSistema && c.tipo === "selecao"
        ? [...new Set((c.opcoes ?? []).map((o) => String(o).trim()).filter(Boolean))].slice(0, 50)
        : undefined;
    limpas.push({
      id: c.id,
      nome,
      tipo: c.tipo,
      // Responsável e Status nunca somem (o quadro depende deles).
      ativo: c.id === "responsavel" || c.id === "status" ? true : c.ativo !== false,
      sistema: ehSistema,
      ...(opcoes ? { opcoes } : {}),
      ...(c.cores && Object.keys(c.cores).length > 0 ? { cores: c.cores } : {}),
    });
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("salvar_colunas_quadro", {
    p_quadro: quadroId,
    p_colunas: limpas,
  });
  if (error) return { erro: error.message };

  revalidatePath(`/dashboard/quadro/${quadroId}`);
  return { ok: true };
}
