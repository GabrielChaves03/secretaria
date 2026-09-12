import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function upsertContact({
  escritorioId,
  instagramAccountId,
  igScopedId,
  igUsername,
}: {
  escritorioId: string;
  instagramAccountId: string;
  igScopedId: string;
  igUsername?: string | null;
}) {
  const { data: existing, error: selectError } = await supabaseAdmin()
    .from("contacts")
    .select("*")
    .eq("instagram_account_id", instagramAccountId)
    .eq("ig_scoped_id", igScopedId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Falha ao buscar contato: ${selectError.message}`);
  }

  if (existing) {
    if (igUsername && igUsername !== existing.ig_username) {
      await supabaseAdmin()
        .from("contacts")
        .update({ ig_username: igUsername, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return existing;
  }

  const { data: created, error: insertError } = await supabaseAdmin()
    .from("contacts")
    .insert({
      escritorio_id: escritorioId,
      instagram_account_id: instagramAccountId,
      ig_scoped_id: igScopedId,
      ig_username: igUsername ?? null,
    })
    .select()
    .single();

  if (insertError || !created) {
    throw new Error(`Falha ao criar contato: ${insertError?.message}`);
  }

  return created;
}

export async function markContactReplied(contactId: string) {
  await supabaseAdmin()
    .from("contacts")
    .update({ last_reply_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", contactId);
}

export async function setContactAutomation(contactId: string, automationId: string) {
  await supabaseAdmin()
    .from("contacts")
    .update({ last_automation_id: automationId, updated_at: new Date().toISOString() })
    .eq("id", contactId);
}
