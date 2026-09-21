/**
 * Tipos e constantes do Editor de Vídeos — client-safe, sem import de
 * servidor. Consultas em `video-pedidos-consultas.ts` (server-only).
 *
 * Fila manual: o agente de edição (video-use + HyperFrames) roda pelo Claude
 * Code local do admin, sem servidor — então o status só avança pelo painel
 * de admin (ver `src/app/editor-de-videos/actions.ts`), nunca sozinho.
 */

export const STATUS_VIDEO = ["pendente", "em_edicao", "concluido"] as const;
export type StatusVideo = (typeof STATUS_VIDEO)[number];

export const ROTULO_STATUS_VIDEO: Record<StatusVideo, string> = {
  pendente: "Pendente",
  em_edicao: "Em edição",
  concluido: "Concluído",
};

/** Classe da pílula (ver globals.css) por status. */
export const PILL_STATUS_VIDEO: Record<StatusVideo, string> = {
  pendente: "pill pill-blue",
  em_edicao: "pill pill-yellow",
  concluido: "pill pill-green",
};

export type VideoPedido = {
  id: string;
  usuario_id: string;
  nome_arquivo: string;
  instrucoes: string | null;
  status: StatusVideo;
  criado_em: string;
  /** URL assinada (expira) do vídeo editado — `null` até o status virar "concluido". */
  urlEditado: string | null;
};

/** Pedido visto pelo admin, com o escritório/pessoa de origem e o vídeo original pra baixar. */
export type VideoPedidoAdmin = {
  id: string;
  nome_arquivo: string;
  instrucoes: string | null;
  status: StatusVideo;
  criado_em: string;
  escritorioNome: string;
  usuarioNome: string;
  urlOriginal: string;
};

// Mantido em sincronia com o file_size_limit do bucket "videos-pedidos"
// (migration 0015).
export const TAMANHO_MAXIMO_VIDEO = 2 * 1024 * 1024 * 1024; // 2 GiB

// Cosmético (filtro do seletor de arquivo) — a validação de verdade é o
// allowed_mime_types do bucket.
export const EXTENSOES_VIDEO_ACEITAS = ".mp4,.mov,.mkv,.webm,.avi";
