"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { AutomacaoInput, TipoCorrespondencia } from "@/lib/manychat-automacoes";

export type EstadoAutomacao = { erro: string } | undefined;

function linhasDoCampo(valor: FormDataEntryValue | null): string[] {
  if (typeof valor !== "string") return [];
  return valor
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function lerFormularioAutomacao(formData: FormData): AutomacaoInput {
  const matchType = (formData.get("match_type") as TipoCorrespondencia) || "contains";
  return {
    name: String(formData.get("name") ?? "").trim(),
    active: formData.get("active") === "on",
    triggerComment: formData.get("trigger_comment") === "on",
    triggerStoryReply: formData.get("trigger_story_reply") === "on",
    triggerDm: formData.get("trigger_dm") === "on",
    keywords: linhasDoCampo(formData.get("keywords")),
    matchType,
    targetMediaId: (formData.get("target_media_id") as string) || null,
    targetMediaPermalink: (formData.get("target_media_permalink") as string) || null,
    targetMediaThumbnailUrl: (formData.get("target_media_thumbnail_url") as string) || null,
    publicReplies: linhasDoCampo(formData.get("public_replies")),
    dmWelcomeText: (formData.get("dm_welcome_text") as string) || null,
    dmQuickReplyLabel: (formData.get("dm_quick_reply_label") as string) || null,
    linkMessageText: (formData.get("link_message_text") as string) || null,
    linkButtonLabel: (formData.get("link_button_label") as string) || null,
    linkUrl: (formData.get("link_url") as string) || null,
    reminderText: (formData.get("reminder_text") as string) || null,
    reminderDelayMinutes: Number(formData.get("reminder_delay_minutes") ?? 60) || 60,
  };
}

function paraLinha(input: AutomacaoInput) {
  return {
    name: input.name,
    active: input.active,
    trigger_comment: input.triggerComment,
    trigger_story_reply: input.triggerStoryReply,
    trigger_dm: input.triggerDm,
    keywords: input.keywords,
    match_type: input.matchType,
    target_media_id: input.targetMediaId ?? null,
    target_media_permalink: input.targetMediaPermalink ?? null,
    target_media_thumbnail_url: input.targetMediaThumbnailUrl ?? null,
    public_replies: input.publicReplies,
    dm_welcome_text: input.dmWelcomeText ?? null,
    dm_quick_reply_label: input.dmQuickReplyLabel ?? null,
    link_message_text: input.linkMessageText ?? null,
    link_button_label: input.linkButtonLabel ?? null,
    link_url: input.linkUrl ?? null,
    reminder_text: input.reminderText ?? null,
    reminder_delay_minutes: input.reminderDelayMinutes,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Recria a sequência de follow-ups (link → lembrete) a partir dos campos da
 * automação. `queue.followup_id` referencia essas linhas quando a pessoa
 * toca no botão de resposta rápida (ver `lib/manychat/webhook-processing.ts`).
 */
async function sincronizarFollowups(automationId: string, input: AutomacaoInput) {
  const supabase = await criarClienteServidor();
  await supabase.from("followups").delete().eq("automation_id", automationId);

  const linhas: Record<string, unknown>[] = [];
  if (input.linkMessageText || input.linkUrl) {
    linhas.push({
      automation_id: automationId,
      step: 1,
      kind: "link",
      delay_minutes: 0,
      message_text: input.linkMessageText ?? null,
      button_label: input.linkButtonLabel ?? null,
      button_url: input.linkUrl ?? null,
    });
  }
  if (input.reminderText) {
    linhas.push({
      automation_id: automationId,
      step: 2,
      kind: "reminder",
      delay_minutes: input.reminderDelayMinutes,
      message_text: input.reminderText,
      button_label: null,
      button_url: null,
    });
  }

  if (linhas.length > 0) {
    const { error } = await supabase.from("followups").insert(linhas);
    if (error) throw new Error(`Falha ao salvar sequência de follow-up: ${error.message}`);
  }
}

export async function criarAutomacaoAction(
  contaId: string,
  _estadoAnterior: EstadoAutomacao,
  formData: FormData,
): Promise<EstadoAutomacao> {
  await requererUsuario();
  const input = lerFormularioAutomacao(formData);
  if (!input.name) return { erro: "Dá um nome pra automação antes de salvar." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("automations")
    .insert({ ...paraLinha(input), instagram_account_id: contaId })
    .select("id")
    .single();

  if (error || !data) {
    return { erro: error?.message ?? "Não foi possível criar a automação." };
  }

  await sincronizarFollowups(data.id as string, input);

  // redirect() lança um erro de controle internamente — precisa ficar fora
  // de qualquer try/catch, senão a navegação é engolida mesmo com sucesso.
  revalidatePath(`/manychat/contas/${contaId}`);
  redirect(`/manychat/contas/${contaId}?criada=1`);
}

export async function atualizarAutomacaoAction(
  contaId: string,
  id: string,
  _estadoAnterior: EstadoAutomacao,
  formData: FormData,
): Promise<EstadoAutomacao> {
  await requererUsuario();
  const input = lerFormularioAutomacao(formData);
  if (!input.name) return { erro: "Dá um nome pra automação antes de salvar." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("automations").update(paraLinha(input)).eq("id", id);
  if (error) return { erro: error.message };

  await sincronizarFollowups(id, input);

  revalidatePath(`/manychat/contas/${contaId}`);
  redirect(`/manychat/contas/${contaId}?atualizada=1`);
}

export async function apagarAutomacaoAction(contaId: string, id: string) {
  await requererUsuario();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("automations").delete().eq("id", id);

  if (error) {
    redirect(`/manychat/contas/${contaId}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/manychat/contas/${contaId}`);
  redirect(`/manychat/contas/${contaId}?excluida=1`);
}

export async function alternarAutomacaoAtivaAction(contaId: string, id: string, active: boolean) {
  await requererUsuario();
  const supabase = await criarClienteServidor();
  await supabase.from("automations").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/manychat/contas/${contaId}`);
}
