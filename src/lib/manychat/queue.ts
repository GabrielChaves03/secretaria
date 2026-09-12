import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type QueueKind = "private_reply" | "dm_welcome" | "link" | "reminder" | "public_reply";
export type RecipientType = "comment_id" | "id";

type EnqueueParams = {
  escritorioId: string;
  contactId: string;
  automationId?: string | null;
  followupId?: string | null;
  kind: QueueKind;
  recipientType: RecipientType;
  recipientValue: string;
  messageText?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  quickReplyLabel?: string | null;
  bypasses24hWindow?: boolean;
  availableAt?: Date;
  expiresAt?: Date | null;
  dedupeKey: string;
};

/**
 * Insere um item na fila. Usa `dedupe_key` (coluna unique) com
 * ignoreDuplicates para nunca duplicar envio se o webhook reenviar o evento.
 */
export async function enqueue(params: EnqueueParams) {
  const { error } = await supabaseAdmin()
    .from("queue")
    .upsert(
      {
        escritorio_id: params.escritorioId,
        contact_id: params.contactId,
        automation_id: params.automationId ?? null,
        followup_id: params.followupId ?? null,
        kind: params.kind,
        recipient_type: params.recipientType,
        recipient_value: params.recipientValue,
        message_text: params.messageText ?? null,
        button_label: params.buttonLabel ?? null,
        button_url: params.buttonUrl ?? null,
        quick_reply_label: params.quickReplyLabel ?? null,
        bypasses_24h_window: params.bypasses24hWindow ?? false,
        available_at: (params.availableAt ?? new Date()).toISOString(),
        expires_at: params.expiresAt ? params.expiresAt.toISOString() : null,
        dedupe_key: params.dedupeKey,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );

  if (error) {
    throw new Error(`Falha ao enfileirar (${params.kind}): ${error.message}`);
  }
}
