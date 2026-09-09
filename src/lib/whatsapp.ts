/**
 * Tipos e helpers de WhatsApp — client-safe (sem import de servidor).
 * Consulta em `whatsapp-consultas.ts`, envio em `whatsapp-envio.ts` (server-only).
 */

export type TipoAvisoWhatsapp = "atribuicao" | "status" | "comentario" | "prazo";

export type ConfigWhatsapp = {
  escritorio_id: string;
  ativo: boolean;
  endpoint_url: string | null;
  token: string | null;
  notif_atribuicao: boolean;
  notif_status: boolean;
  notif_comentario: boolean;
  notif_prazo: boolean;
  atualizado_em: string;
};

export const ROTULO_AVISO_WHATSAPP: Record<TipoAvisoWhatsapp, string> = {
  atribuicao: "Nova demanda atribuída",
  status: "Status ou dados da demanda mudaram",
  comentario: "Novo comentário na demanda",
  prazo: "Prazo chegando ou vencido",
};

/**
 * Normaliza um telefone brasileiro para só dígitos com DDI 55
 * (formato que a maioria dos gateways de WhatsApp espera). Devolve `null`
 * se não sobrar um número plausível.
 */
export function normalizarTelefone(bruto: string | null | undefined): string | null {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  if (digitos.startsWith("55")) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}
