import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import { obterOrigem } from "@/lib/origem";
import {
  CAMPO_AVISO_WHATSAPP,
  montarMensagemNitro,
  normalizarTelefone,
  type ConfigWhatsapp,
  type TipoAvisoWhatsapp,
} from "@/lib/whatsapp";

export type ResultadoEnvio =
  | { ok: true; status: number; corpo: string }
  /** `definitivo`: erro que não adianta repetir (ex.: número sem WhatsApp). */
  | { ok: false; motivo: string; definitivo?: boolean };

/** Há um gateway padrão (o do Nitro) configurado no ambiente? */
export function temGatewayPadrao(): boolean {
  return !!process.env.WHATSAPP_GATEWAY_URL;
}

/**
 * URL/token efetivos: os do escritório, se o chefe preencheu uma URL
 * própria; senão o gateway padrão do Nitro (`WHATSAPP_GATEWAY_URL` /
 * `WHATSAPP_GATEWAY_TOKEN` — hoje uma Evolution API hospedada por um
 * programador parceiro; `gateway-whatsapp/` é o fallback próprio).
 */
function resolverGateway(
  config: Pick<ConfigWhatsapp, "endpoint_url" | "token">,
): { url: string | null; token: string | null } {
  if (config.endpoint_url) return { url: config.endpoint_url, token: config.token };
  return {
    url: process.env.WHATSAPP_GATEWAY_URL || null,
    token: process.env.WHATSAPP_GATEWAY_TOKEN || null,
  };
}

/**
 * Evolution API (v2): URL no formato `.../message/sendText/{instancia}`.
 * Pede header `apikey` e corpo `{ number, text }` em vez do nosso formato.
 */
function ehEvolution(url: string) {
  return /\/message\/sendText\/[^/]+\/?$/.test(new URL(url).pathname);
}

/**
 * Faz o POST no gateway, em um de dois formatos (detectado pela URL):
 * - Evolution API:  POST .../message/sendText/{instancia}
 *     apikey: {token}            { "number": "5511...", "text": "..." }
 * - Genérico (o do `gateway-whatsapp/`):  POST {url}
 *     Authorization: Bearer {token}   { "telefone": "5511...", "mensagem": "..." }
 *
 * Nunca lança — devolve sempre um ResultadoEnvio.
 */
export async function enviarMensagemWhatsapp(
  config: Pick<ConfigWhatsapp, "ativo" | "endpoint_url" | "token">,
  telefone: string | null | undefined,
  mensagem: string,
): Promise<ResultadoEnvio> {
  if (!config.ativo) return { ok: false, motivo: "Integração desligada." };
  const gateway = resolverGateway(config);
  if (!gateway.url) return { ok: false, motivo: "URL do endpoint não configurada." };

  const tel = normalizarTelefone(telefone);
  if (!tel) return { ok: false, motivo: "Telefone inválido ou vazio." };

  try {
    const evolution = ehEvolution(gateway.url);
    const auth: Record<string, string> = gateway.token
      ? evolution
        ? { apikey: gateway.token }
        : { Authorization: `Bearer ${gateway.token}` }
      : {};

    const res = await fetch(gateway.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify(
        evolution ? { number: tel, text: mensagem } : { telefone: tel, mensagem },
      ),
      signal: AbortSignal.timeout(10000),
    });
    const corpo = (await res.text()).slice(0, 500);
    if (!res.ok) {
      return {
        ok: false,
        motivo: `HTTP ${res.status}: ${corpo || "sem corpo"}`,
        // Só não adianta repetir se o número não tem WhatsApp. Na Evolution
        // um 400 também pode ser "instância desconectada" — esse repete.
        definitivo: evolution
          ? /"exists":\s*false/.test(corpo)
          : res.status >= 400 && res.status < 500,
      };
    }
    return { ok: true, status: res.status, corpo };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, motivo: `Falha na requisição: ${err}` };
  }
}

/**
 * Avisa o dono de uma demanda no WhatsApp, se:
 * - o escritório tem a integração ligada e com esse tipo de aviso habilitado;
 * - o dono tem número e não desligou os avisos (`whatsapp_ativo`).
 *
 * `corpo` é só o miolo — a saudação ("Boa tarde, Maria!") e o link da
 * demanda são acrescentados aqui. Silencioso e à prova de erro — nunca
 * quebra a ação que a chamou.
 */
export async function avisarDono(opts: {
  donoId: string;
  tipo: TipoAvisoWhatsapp;
  corpo: string;
  demandaId?: string;
}): Promise<void> {
  try {
    const supabase = await criarClienteServidor();

    const { data: cfg } = await supabase
      .from("escritorio_whatsapp")
      .select("*")
      .maybeSingle();
    const config = cfg as ConfigWhatsapp | null;
    if (!config || !config.ativo || !config[CAMPO_AVISO_WHATSAPP[opts.tipo]]) return;

    const { data: dono } = await supabase
      .from("usuarios")
      .select("nome, papel, telefone, whatsapp_ativo")
      .eq("id", opts.donoId)
      .maybeSingle();
    if (!dono || dono.whatsapp_ativo === false || !dono.telefone) return;

    const link = opts.demandaId
      ? `${await obterOrigem()}/dashboard/${opts.demandaId}/editar`
      : null;
    const mensagem = montarMensagemNitro({
      nome: dono.nome as string | null,
      papel: dono.papel as string | null,
      corpo: opts.corpo,
      link,
    });

    const r = await enviarMensagemWhatsapp(config, dono.telefone as string, mensagem);
    if (!r.ok) console.error("[whatsapp] envio falhou:", r.motivo);
  } catch (e) {
    console.error("[whatsapp] avisarDono:", e);
  }
}
