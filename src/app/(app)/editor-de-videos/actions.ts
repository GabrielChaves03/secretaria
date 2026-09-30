"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ehAdmin } from "@/lib/admin";
import { TAMANHO_MAXIMO_VIDEO } from "@/lib/video-pedidos";

const BUCKET = "videos-pedidos";
const CAMINHO = "/editor-de-videos";

function extensaoDe(nome: string) {
  const i = nome.lastIndexOf(".");
  return i === -1 ? "" : nome.slice(i);
}

export type EstadoEnvioVideo = { erro: string } | { ok: true } | undefined;

/**
 * Envia um vídeo bruto pra fila. Sobe pro Storage primeiro (com um id gerado
 * aqui) e só depois insere a linha — assim não precisamos de policy de
 * UPDATE só pra preencher o caminho depois. Se o insert falhar, desfaz o
 * upload.
 */
export async function criarPedidoVideo(
  _estadoAnterior: EstadoEnvioVideo,
  formData: FormData,
): Promise<EstadoEnvioVideo> {
  const perfil = await requererEscritorio();
  const arquivo = formData.get("video");
  const instrucoes = String(formData.get("instrucoes") ?? "").trim();

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Selecione um vídeo." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_VIDEO) {
    return { erro: "Vídeo muito grande (máx. 2GB)." };
  }

  const supabase = await criarClienteServidor();
  const id = randomUUID();
  const caminho = `${perfil.escritorioId}/${id}/original${extensaoDe(arquivo.name)}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: arquivo.type || undefined });

  if (erroUpload) {
    return { erro: `Falha ao enviar o vídeo: ${erroUpload.message}` };
  }

  const { error: erroInsert } = await supabase.from("video_pedidos").insert({
    id,
    usuario_id: perfil.id,
    nome_arquivo: arquivo.name,
    instrucoes: instrucoes || null,
    video_original_path: caminho,
  });

  if (erroInsert) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    return { erro: erroInsert.message };
  }

  revalidatePath(CAMINHO);
  return { ok: true };
}

/**
 * Cancela/limpa um pedido (dono ou chefe — RLS decide o delete da linha).
 * Remove os arquivos do Storage antes, já que apagar a linha não faz isso
 * sozinho.
 */
export async function apagarPedidoVideo(
  id: string,
): Promise<{ erro: string } | undefined> {
  await requererEscritorio();
  if (!id) return { erro: "Pedido não identificado." };

  const supabase = await criarClienteServidor();

  const { data: pedido } = await supabase
    .from("video_pedidos")
    .select("video_original_path, video_editado_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("video_pedidos").delete().eq("id", id);
  if (error) return { erro: error.message };

  const caminhos = [pedido?.video_original_path, pedido?.video_editado_path].filter(
    (v): v is string => !!v,
  );
  if (caminhos.length) {
    await supabase.storage.from(BUCKET).remove(caminhos);
  }

  revalidatePath(CAMINHO);
}

/** Garante sessão + e-mail em ADMIN_EMAILS antes de qualquer ação da fila global. */
async function requererAdmin() {
  const perfil = await requererEscritorio();
  if (!ehAdmin(perfil.email)) {
    throw new Error("Acesso restrito.");
  }
  return perfil;
}

/** Marca que o admin começou a editar (feedback visual pro escritório que enviou). */
export async function marcarEmEdicao(id: string): Promise<{ erro: string } | undefined> {
  await requererAdmin();
  if (!id) return { erro: "Pedido não identificado." };

  const { error } = await supabaseAdmin()
    .from("video_pedidos")
    .update({ status: "em_edicao" })
    .eq("id", id);

  if (error) return { erro: error.message };
  revalidatePath(CAMINHO);
}

export type EstadoConcluirVideo = { erro: string } | { ok: true } | undefined;

/**
 * Admin sobe o vídeo editado e fecha o pedido. A pasta é derivada do
 * `video_original_path` já salvo (mesmo prefixo `escritorio_id/pedido_id/`),
 * em vez de confiar num campo escondido do form.
 */
export async function concluirPedidoVideo(
  _estadoAnterior: EstadoConcluirVideo,
  formData: FormData,
): Promise<EstadoConcluirVideo> {
  await requererAdmin();

  const id = String(formData.get("id") ?? "");
  const arquivo = formData.get("video_editado");

  if (!id) return { erro: "Pedido não identificado." };
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Selecione o vídeo editado." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_VIDEO) {
    return { erro: "Vídeo muito grande (máx. 2GB)." };
  }

  const admin = supabaseAdmin();

  const { data: pedido } = await admin
    .from("video_pedidos")
    .select("video_original_path")
    .eq("id", id)
    .maybeSingle();

  const original = pedido?.video_original_path as string | undefined;
  if (!original) return { erro: "Pedido não encontrado." };

  const pasta = original.slice(0, original.lastIndexOf("/"));
  const caminho = `${pasta}/editado${extensaoDe(arquivo.name)}`;

  const { error: erroUpload } = await admin.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: arquivo.type || undefined, upsert: true });
  if (erroUpload) {
    return { erro: `Falha ao enviar o vídeo editado: ${erroUpload.message}` };
  }

  const { error: erroUpdate } = await admin
    .from("video_pedidos")
    .update({ video_editado_path: caminho, status: "concluido" })
    .eq("id", id);
  if (erroUpdate) return { erro: erroUpdate.message };

  revalidatePath(CAMINHO);
  return { ok: true };
}
