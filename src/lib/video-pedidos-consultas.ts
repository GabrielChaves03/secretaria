import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StatusVideo, VideoPedido, VideoPedidoAdmin } from "@/lib/video-pedidos";

const BUCKET = "videos-pedidos";
const URL_EXPIRA_SEGUNDOS = 60 * 60; // 1h — suficiente pra abrir/baixar na hora

/**
 * Pedidos do escritório logado (funcionário vê os próprios, chefe vê todos —
 * RLS de `video_pedidos_select` decide). Usado em `/editor-de-videos`.
 */
export async function listarPedidosVideo(): Promise<VideoPedido[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("video_pedidos")
    .select("id, usuario_id, nome_arquivo, instrucoes, status, criado_em, video_editado_path")
    .order("criado_em", { ascending: false });

  if (error || !data) return [];

  return Promise.all(
    data.map(async (p) => {
      const caminhoEditado = p.video_editado_path as string | null;
      let urlEditado: string | null = null;
      if (caminhoEditado) {
        const { data: assinada } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(caminhoEditado, URL_EXPIRA_SEGUNDOS);
        urlEditado = assinada?.signedUrl ?? null;
      }
      return {
        id: p.id as string,
        usuario_id: p.usuario_id as string,
        nome_arquivo: p.nome_arquivo as string,
        instrucoes: p.instrucoes as string | null,
        status: p.status as StatusVideo,
        criado_em: p.criado_em as string,
        urlEditado,
      };
    }),
  );
}

/**
 * Fila global (todos os escritórios) de pedidos ainda não concluídos — só
 * pra tela de admin. Sempre chame `ehAdmin()` (`@/lib/admin`) antes: esta
 * função usa `supabaseAdmin()` (service role) e ignora RLS/multi-tenant de
 * propósito.
 */
export async function listarFilaGlobalAdmin(): Promise<VideoPedidoAdmin[]> {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("video_pedidos")
    .select(
      "id, nome_arquivo, instrucoes, status, criado_em, video_original_path, escritorios(nome), usuarios(nome)",
    )
    .in("status", ["pendente", "em_edicao"])
    .order("criado_em", { ascending: true });

  if (error || !data) return [];

  return Promise.all(
    data.map(async (p) => {
      const caminhoOriginal = p.video_original_path as string;
      const { data: assinada } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(caminhoOriginal, URL_EXPIRA_SEGUNDOS);

      // Sem tipos gerados do banco, o supabase-js infere o embed como array —
      // na prática é sempre 0 ou 1 linha (relação N:1 por FK).
      const escritorio = (p.escritorios as { nome: string | null }[] | null)?.[0];
      const usuario = (p.usuarios as { nome: string | null }[] | null)?.[0];

      return {
        id: p.id as string,
        nome_arquivo: p.nome_arquivo as string,
        instrucoes: p.instrucoes as string | null,
        status: p.status as StatusVideo,
        criado_em: p.criado_em as string,
        escritorioNome: escritorio?.nome ?? "—",
        usuarioNome: usuario?.nome ?? "Alguém",
        urlOriginal: assinada?.signedUrl ?? "",
      };
    }),
  );
}
