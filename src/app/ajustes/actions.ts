"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { obterPerfil } from "@/lib/perfil-consultas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { enviarMensagemWhatsapp } from "@/lib/whatsapp-envio";
import { FUNDOS } from "@/lib/aparencia";

export type EstadoAjuste = { erro: string } | { ok: string } | undefined;

/**
 * Preferência pessoal de WhatsApp: número + receber avisos. Qualquer usuário.
 */
export async function salvarPreferenciaWhatsapp(
  _anterior: EstadoAjuste,
  formData: FormData,
): Promise<EstadoAjuste> {
  const usuario = await requererUsuario();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const receber = formData.get("whatsapp_ativo") === "on";

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ telefone: telefone || null, whatsapp_ativo: receber })
    .eq("id", usuario.id);

  if (error) return { erro: error.message };

  revalidatePath("/ajustes");
  return { ok: "Preferências salvas." };
}

/**
 * Fundo de tela pessoal (estilo "capa" do Notion) — qualquer usuário escolhe
 * o seu, entre as opções do catálogo (`src/lib/aparencia.ts`).
 */
export async function salvarAparencia(chave: string) {
  const usuario = await requererUsuario();

  const valida = FUNDOS.some((f) => f.chave === chave);
  if (!valida) return { erro: "Imagem inválida." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ imagem_fundo: chave })
    .eq("id", usuario.id);

  if (error) return { erro: error.message };

  // O fundo é lido no layout raiz — precisa invalidar além de /ajustes.
  revalidatePath("/", "layout");
  return { ok: "Fundo atualizado." };
}

/**
 * Integração de WhatsApp do escritório (gateway). Só o chefe.
 */
export async function salvarIntegracaoWhatsapp(
  _anterior: EstadoAjuste,
  formData: FormData,
): Promise<EstadoAjuste> {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (!perfil.escritorioId) return { erro: "Sem escritório." };
  if (perfil.papel !== "chefe") return { erro: "Só o chefe configura a integração." };

  const dados = {
    escritorio_id: perfil.escritorioId,
    ativo: formData.get("ativo") === "on",
    endpoint_url: String(formData.get("endpoint_url") ?? "").trim() || null,
    token: String(formData.get("token") ?? "").trim() || null,
    notif_atribuicao: formData.get("notif_atribuicao") === "on",
    notif_status: formData.get("notif_status") === "on",
    notif_comentario: formData.get("notif_comentario") === "on",
    notif_prazo: formData.get("notif_prazo") === "on",
    atualizado_em: new Date().toISOString(),
  };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("escritorio_whatsapp")
    .upsert(dados, { onConflict: "escritorio_id" });

  if (error) return { erro: error.message };

  revalidatePath("/ajustes");
  return { ok: "Integração salva." };
}

/**
 * Envia uma mensagem de teste com a URL/token informados no formulário
 * (não precisa ter salvado ainda). Só o chefe.
 */
export async function testarWhatsapp(
  _anterior: EstadoAjuste,
  formData: FormData,
): Promise<EstadoAjuste> {
  await requererUsuario();
  const perfil = await obterPerfil();
  if (perfil.papel !== "chefe") return { erro: "Só o chefe pode testar." };

  const endpoint_url = String(formData.get("endpoint_url") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim() || null;
  const telefone = String(formData.get("telefone_teste") ?? "").trim();

  if (!endpoint_url) return { erro: "Preencha a URL do endpoint antes de testar." };
  if (!telefone) return { erro: "Informe um número para receber o teste." };

  const r = await enviarMensagemWhatsapp(
    { ativo: true, endpoint_url, token },
    telefone,
    "✅ Teste de integração do WhatsApp — Secretária. Se você recebeu isto, está funcionando.",
  );

  if (r.ok) {
    return { ok: `Enviado (HTTP ${r.status}). Confira o WhatsApp.` };
  }
  return { erro: `Não enviou — ${r.motivo}` };
}
