"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoCompromisso = { erro: string } | { ok: true } | undefined;

/** Extrai os campos crus do formulário (título/descrição/data/hora). */
function lerCampos(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    data: String(formData.get("data") ?? "").trim(),
    hora: String(formData.get("hora") ?? "").trim(),
  };
}

/**
 * Junta data + hora num instante UTC. Fuso fixo -03:00 (América/São Paulo) —
 * o Brasil não tem mais horário de verão desde 2019, então isso é seguro
 * sem precisar de uma lib de fuso horário.
 */
function paraDataHora(data: string, hora: string): Date | null {
  if (!data || !hora) return null;
  const d = new Date(`${data}T${hora}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Cria um compromisso (reunião etc.) do usuário logado. Hoje só aparece no
 * calendário — o lembrete automático por WhatsApp fica pra quando essa
 * integração existir (ver pendências do projeto).
 */
export async function criarCompromisso(
  _estadoAnterior: EstadoCompromisso,
  formData: FormData,
): Promise<EstadoCompromisso> {
  const usuario = await requererUsuario();
  const { titulo, descricao, data, hora } = lerCampos(formData);

  if (!titulo) return { erro: "Informe um título." };
  const dataHora = paraDataHora(data, hora);
  if (!dataHora) return { erro: "Informe data e horário válidos." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("compromissos").insert({
    usuario_id: usuario.id,
    titulo,
    descricao: descricao || null,
    data_hora: dataHora.toISOString(),
  });

  if (error) return { erro: error.message };

  revalidatePath("/calendario");
  return { ok: true };
}

/** Atualiza título/descrição/data-hora de um compromisso existente. */
export async function atualizarCompromisso(
  _estadoAnterior: EstadoCompromisso,
  formData: FormData,
): Promise<EstadoCompromisso> {
  await requererUsuario();
  const id = String(formData.get("id") ?? "");
  const { titulo, descricao, data, hora } = lerCampos(formData);

  if (!id) return { erro: "Compromisso inválido." };
  if (!titulo) return { erro: "Informe um título." };
  const dataHora = paraDataHora(data, hora);
  if (!dataHora) return { erro: "Informe data e horário válidos." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("compromissos")
    .update({
      titulo,
      descricao: descricao || null,
      data_hora: dataHora.toISOString(),
    })
    .eq("id", id);

  if (error) return { erro: error.message };

  revalidatePath("/calendario");
  return { ok: true };
}

/** Apaga um compromisso (a RLS garante que só o dono ou o chefe conseguem). */
export async function apagarCompromisso(formData: FormData) {
  await requererUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await criarClienteServidor();
  await supabase.from("compromissos").delete().eq("id", id);
  revalidatePath("/calendario");
}
