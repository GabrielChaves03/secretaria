/**
 * Tipos e helpers de "automação" (ManyChat) — client-safe, sem import de
 * servidor. Consultas em `manychat-automacoes-consultas.ts` (server-only).
 */

export const TIPOS_CORRESPONDENCIA = ["contains", "exact", "any"] as const;
export type TipoCorrespondencia = (typeof TIPOS_CORRESPONDENCIA)[number];

export const ROTULO_CORRESPONDENCIA: Record<TipoCorrespondencia, string> = {
  contains: "Contém a palavra",
  exact: "É exatamente a palavra",
  any: "Qualquer comentário/mensagem",
};

export type Automacao = {
  id: string;
  escritorio_id: string;
  instagram_account_id: string;
  name: string;
  active: boolean;
  trigger_comment: boolean;
  trigger_story_reply: boolean;
  trigger_dm: boolean;
  keywords: string[];
  match_type: TipoCorrespondencia;
  target_media_id: string | null;
  target_media_permalink: string | null;
  target_media_thumbnail_url: string | null;
  public_replies: string[];
  dm_welcome_text: string | null;
  dm_quick_reply_label: string | null;
  link_message_text: string | null;
  link_button_label: string | null;
  link_url: string | null;
  reminder_text: string | null;
  reminder_delay_minutes: number;
  created_at: string;
  updated_at: string;
};

export type AutomacaoInput = {
  name: string;
  active: boolean;
  triggerComment: boolean;
  triggerStoryReply: boolean;
  triggerDm: boolean;
  keywords: string[];
  matchType: TipoCorrespondencia;
  targetMediaId?: string | null;
  targetMediaPermalink?: string | null;
  targetMediaThumbnailUrl?: string | null;
  publicReplies: string[];
  dmWelcomeText?: string | null;
  dmQuickReplyLabel?: string | null;
  linkMessageText?: string | null;
  linkButtonLabel?: string | null;
  linkUrl?: string | null;
  reminderText?: string | null;
  reminderDelayMinutes: number;
};

export function rotulosGatilho(automacao: {
  trigger_comment: boolean;
  trigger_story_reply: boolean;
  trigger_dm: boolean;
}): string {
  const rotulos: string[] = [];
  if (automacao.trigger_comment) rotulos.push("Comentário");
  if (automacao.trigger_story_reply) rotulos.push("Resposta a story");
  if (automacao.trigger_dm) rotulos.push("DM");
  return rotulos.join(" · ") || "Nenhum gatilho";
}
