import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import {
  normalizarTelefone,
  type ConfigWhatsapp,
  type TipoAvisoWhatsapp,
} from "@/lib/whatsapp";

export type ResultadoEnvio =
  | { ok: true; status: number; corpo: string }
  | { ok: false; motivo: string };

/**
 * Faz o POST no gateway configurado. Formato genérico:
 *   POST {endpoint_url}
 *   Authorization: Bearer {token}   (se houver token)
 *   { "telefone": "5511...", "mensagem": "..." }
 *
 * Quando a spec da Nandu chegar, é só ajustar o corpo/headers aqui.
 * Nunca lança — devolve sempre um ResultadoEnvio.
 */
export async function enviarMensagemWhatsapp(
  config: Pick<ConfigWhatsapp, "ativo" | "endpoint_url" | "token">,
  telefone: string | null | undefined,
  mensagem: string,
): Promise<ResultadoEnvio> {
  if (!config.ativo) return { ok: false, motivo: "Integração desligada." };
  if (!config.endpoint_url) return { ok: false, motivo: "URL do endpoint não configurada." };

  const tel = normalizarTelefone(telefone);
  if (!tel) return { ok: false, motivo: "Telefone inválido ou vazio." };

  try {
    const res = await fetch(config.endpoint_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify({ telefone: tel, mensagem }),
      signal: AbortSignal.timeout(6000),
    });
    const corpo = (await res.text()).slice(0, 500);
    if (!res.ok) {
      return { ok: false, motivo: `HTTP ${res.status}: ${corpo || "sem corpo"}` };
    }
    return { ok: true, status: res.status, corpo };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, motivo: `Falha na requisição: ${err}` };
  }
}

const CAMPO_TOGGLE: Record<TipoAvisoWhatsapp, keyof ConfigWhatsapp> = {
  atribuicao: "notif_atribuicao",
  status: "notif_status",
  comentario: "notif_comentario",
  prazo: "notif_prazo",
};

/**
 * Avisa o dono de uma demanda no WhatsApp, se:
 * - o escritório tem a integração ligada e com esse tipo de aviso habilitado;
 * - o dono tem número e não desligou os avisos (`whatsapp_ativo`).
 *
 * Silencioso e à prova de erro — nunca quebra a ação que a chamou.
 */
export async function avisarDono(opts: {
  donoId: string;
  tipo: TipoAvisoWhatsapp;
  mensagem: string;
}): Promise<void> {
  try {
    const supabase = await criarClienteServidor();

    const { data: cfg } = await supabase
      .from("escritorio_whatsapp")
      .select("*")
      .maybeSingle();
    const config = cfg as ConfigWhatsapp | null;
    if (!config || !config.ativo || !config[CAMPO_TOGGLE[opts.tipo]]) return;

    const { data: dono } = await supabase
      .from("usuarios")
      .select("telefone, whatsapp_ativo")
      .eq("id", opts.donoId)
      .maybeSingle();
    if (!dono || dono.whatsapp_ativo === false || !dono.telefone) return;

    const r = await enviarMensagemWhatsapp(config, dono.telefone as string, opts.mensagem);
    if (!r.ok) console.error("[whatsapp] envio falhou:", r.motivo);
  } catch (e) {
    console.error("[whatsapp] avisarDono:", e);
  }
}
