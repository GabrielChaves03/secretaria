import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { matchesKeywords, pickRandom } from "./text-match";
import { enqueue } from "./queue";
import { upsertContact, markContactReplied, setContactAutomation } from "./contacts";
import { getAccountByIgUserId } from "./instagram-accounts";

type CommentChangeValue = {
  id: string;
  text?: string;
  from?: { id: string; username?: string };
  media?: { id: string; media_product_type?: string };
};

type MessagingItem = {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
    reply_to?: { story?: { id?: string; url?: string } };
  };
};

export type WebhookEntry = {
  id: string;
  time?: number;
  changes?: Array<{ field: string; value: CommentChangeValue }>;
  messaging?: MessagingItem[];
};

/**
 * `entry.id` é o ig_user_id da conta que RECEBEU o evento (documentado pela
 * Meta) — é o que permite rotear o evento pro escritório certo (cada
 * escritório tem sua própria conta conectada). Se não bate com nenhuma
 * conta conectada (webhook de conta desconectada, etc.), ignora
 * silenciosamente.
 */
export async function processWebhookEntry(entry: WebhookEntry) {
  const account = await getAccountByIgUserId(entry.id);
  if (!account) return;

  for (const change of entry.changes ?? []) {
    if (change.field === "comments") {
      await processComment(account.escritorio_id, account.id, change.value);
    }
  }
  for (const messaging of entry.messaging ?? []) {
    await processMessaging(account.escritorio_id, account.id, messaging);
  }
}

async function logEvent(escritorioId: string, eventType: string, igScopedId: string | null, payload: unknown) {
  await supabaseAdmin().from("events").insert({
    escritorio_id: escritorioId,
    event_type: eventType,
    ig_scoped_id: igScopedId,
    raw_payload: payload,
  });
}

async function getActiveAutomations(instagramAccountId: string) {
  const { data, error } = await supabaseAdmin()
    .from("automations")
    .select("*")
    .eq("instagram_account_id", instagramAccountId)
    .eq("active", true);
  if (error) throw new Error(`Falha ao buscar automations: ${error.message}`);
  return data ?? [];
}

async function processComment(escritorioId: string, instagramAccountId: string, value: CommentChangeValue) {
  await logEvent(escritorioId, "comment", value.from?.id ?? null, value);

  if (!value.from?.id || !value.id) return;

  const automations = await getActiveAutomations(instagramAccountId);
  const candidate = automations.find(
    (a) =>
      a.trigger_comment &&
      (!a.target_media_id || a.target_media_id === value.media?.id) &&
      matchesKeywords(value.text, a.keywords, a.match_type),
  );

  if (!candidate) return;

  const contact = await upsertContact({
    escritorioId,
    instagramAccountId,
    igScopedId: value.from.id,
    igUsername: value.from.username,
  });
  await setContactAutomation(contact.id, candidate.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (candidate.dm_welcome_text) {
    await enqueue({
      escritorioId,
      contactId: contact.id,
      automationId: candidate.id,
      kind: "private_reply",
      recipientType: "comment_id",
      recipientValue: value.id,
      messageText: candidate.dm_welcome_text,
      quickReplyLabel: candidate.dm_quick_reply_label,
      bypasses24hWindow: true,
      expiresAt,
      dedupeKey: `private_reply:${value.id}`,
    });
  }

  const publicReply = pickRandom<string>(candidate.public_replies ?? []);
  if (publicReply) {
    await enqueue({
      escritorioId,
      contactId: contact.id,
      automationId: candidate.id,
      kind: "public_reply",
      recipientType: "comment_id",
      recipientValue: value.id,
      messageText: publicReply,
      dedupeKey: `public_reply:${value.id}`,
    });
  }
}

async function processMessaging(escritorioId: string, instagramAccountId: string, messaging: MessagingItem) {
  const senderId = messaging.sender?.id;
  const message = messaging.message;
  if (!senderId || !message || message.is_echo) return;

  const isStoryReply = Boolean(message.reply_to?.story);
  const eventType = message.quick_reply ? "quick_reply" : isStoryReply ? "story_reply" : "message";
  await logEvent(escritorioId, eventType, senderId, messaging);

  const contact = await upsertContact({ escritorioId, instagramAccountId, igScopedId: senderId });
  await markContactReplied(contact.id);

  const mid = message.mid ?? `${senderId}:${messaging.timestamp ?? Date.now()}`;

  if (message.quick_reply) {
    // A pessoa tocou no botão de resposta: abre a janela de 24h e dispara a
    // sequência de follow-ups (tabela `followups`, derivada da automação).
    if (!contact.last_automation_id) return;

    const { data: followupRows } = await supabaseAdmin()
      .from("followups")
      .select("*")
      .eq("automation_id", contact.last_automation_id)
      .order("step", { ascending: true });

    for (const followup of followupRows ?? []) {
      const availableAt = new Date(Date.now() + followup.delay_minutes * 60 * 1000);
      await enqueue({
        escritorioId,
        contactId: contact.id,
        automationId: contact.last_automation_id,
        followupId: followup.id,
        kind: followup.kind,
        recipientType: "id",
        recipientValue: senderId,
        messageText: followup.message_text,
        buttonLabel: followup.button_label,
        buttonUrl: followup.button_url,
        availableAt,
        dedupeKey: `${followup.kind}:${followup.id}:${mid}`,
      });
    }
    return;
  }

  // Não é toque de botão: pode ser um gatilho novo (resposta a story ou DM comum).
  const automations = await getActiveAutomations(instagramAccountId);
  const candidate = automations.find((a) => {
    const triggerOk = isStoryReply ? a.trigger_story_reply : a.trigger_dm;
    if (!triggerOk) return false;
    if (isStoryReply && a.target_media_id && message.reply_to?.story?.id !== a.target_media_id) {
      return false;
    }
    return matchesKeywords(message.text, a.keywords, a.match_type);
  });

  if (!candidate || !candidate.dm_welcome_text) return;

  await setContactAutomation(contact.id, candidate.id);

  await enqueue({
    escritorioId,
    contactId: contact.id,
    automationId: candidate.id,
    kind: "dm_welcome",
    recipientType: "id",
    recipientValue: senderId,
    messageText: candidate.dm_welcome_text,
    quickReplyLabel: candidate.dm_quick_reply_label,
    bypasses24hWindow: false,
    dedupeKey: `dm_welcome:${mid}`,
  });
}
