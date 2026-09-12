import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendMessage, replyToComment } from "./instagram";

const BATCH_SIZE = 20;
const MAX_PER_HOUR = 200;
const DELAY_BETWEEN_SENDS_MS = 500; // ~2 por segundo

type QueueRow = {
  id: string;
  contact_id: string;
  kind: "private_reply" | "dm_welcome" | "link" | "reminder" | "public_reply";
  recipient_type: "comment_id" | "id";
  recipient_value: string;
  message_text: string | null;
  button_label: string | null;
  button_url: string | null;
  quick_reply_label: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drena a fila: reivindica um lote (trava atômica no Postgres), envia cada
 * item para a API do Instagram respeitando ~2/s e um teto de ~200/hora, e
 * marca o resultado. Seguro para ser chamado concorrentemente (pelo webhook
 * via `after()` e pelo pg_cron) — a trava garante que nada é enviado 2x.
 *
 * Cada item pode pertencer a um escritório/conta diferente (multi-tenant) —
 * a credencial de envio é resolvida por item via contact → instagram_account.
 */
export async function drainQueue() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: sentLastHour } = await supabaseAdmin()
    .from("queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", oneHourAgo);

  const remainingBudget = MAX_PER_HOUR - (sentLastHour ?? 0);
  if (remainingBudget <= 0) {
    return { drained: 0, reason: "limite_horario_atingido" as const };
  }

  const batchSize = Math.min(BATCH_SIZE, remainingBudget);

  const { data: claimed, error } = await supabaseAdmin().rpc("claim_queue_batch", {
    p_batch_size: batchSize,
  });

  if (error) throw new Error(`Falha ao reivindicar fila: ${error.message}`);
  const items = (claimed ?? []) as QueueRow[];
  if (items.length === 0) return { drained: 0, reason: "fila_vazia" as const };

  const contactIds = [...new Set(items.map((item) => item.contact_id))];
  const { data: contacts, error: contactsError } = await supabaseAdmin()
    .from("contacts")
    .select("id, instagram_account_id")
    .in("id", contactIds);
  if (contactsError) throw new Error(`Falha ao buscar contatos da fila: ${contactsError.message}`);

  const accountIdByContact = new Map((contacts ?? []).map((c) => [c.id, c.instagram_account_id]));
  const accountIds = [...new Set([...accountIdByContact.values()])];

  const { data: accounts, error: accountsError } = await supabaseAdmin()
    .from("instagram_accounts")
    .select("id, ig_user_id, access_token")
    .in("id", accountIds);
  if (accountsError) throw new Error(`Falha ao buscar contas da fila: ${accountsError.message}`);

  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));

  let sent = 0;

  for (const item of items) {
    try {
      const accountId = accountIdByContact.get(item.contact_id);
      const account = accountId ? accountById.get(accountId) : undefined;

      if (!account) {
        throw new Error("Conta do Instagram do contato não encontrada (desconectada?)");
      }

      if (item.kind === "public_reply") {
        await replyToComment(item.recipient_value, account.access_token, item.message_text ?? "");
      } else {
        const recipient =
          item.recipient_type === "comment_id"
            ? { comment_id: item.recipient_value }
            : { id: item.recipient_value };

        const message =
          item.button_url && item.button_label
            ? {
                attachment: {
                  type: "template" as const,
                  payload: {
                    template_type: "button" as const,
                    text: item.message_text ?? "",
                    buttons: [
                      { type: "web_url" as const, url: item.button_url, title: item.button_label },
                    ],
                  },
                },
              }
            : { text: item.message_text ?? "" };

        await sendMessage({
          igUserId: account.ig_user_id,
          accessToken: account.access_token,
          recipient,
          message,
          quickReplyLabel: item.quick_reply_label ?? undefined,
        });
      }

      await supabaseAdmin()
        .from("queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id);
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await supabaseAdmin().from("queue").update({ status: "failed", last_error: message }).eq("id", item.id);
    }

    await sleep(DELAY_BETWEEN_SENDS_MS);
  }

  return { drained: sent };
}
