/**
 * Tipos e helpers de WhatsApp — client-safe (sem import de servidor).
 * Consulta em `whatsapp-consultas.ts`, envio em `whatsapp-envio.ts` (server-only).
 */

export type TipoAvisoWhatsapp =
  | "atribuicao"
  | "status"
  | "comentario"
  | "prazo"
  | "compromisso";

export type ConfigWhatsapp = {
  escritorio_id: string;
  ativo: boolean;
  endpoint_url: string | null;
  token: string | null;
  notif_atribuicao: boolean;
  notif_status: boolean;
  notif_comentario: boolean;
  notif_prazo: boolean;
  notif_compromisso: boolean;
  atualizado_em: string;
};

export const ROTULO_AVISO_WHATSAPP: Record<TipoAvisoWhatsapp, string> = {
  atribuicao: "Nova demanda atribuída",
  status: "Status ou dados da demanda mudaram",
  comentario: "Novo comentário na demanda",
  prazo: "Prazo chegando ou vencido",
  compromisso: "Lembrete de compromisso (30 min antes)",
};

/** Coluna de `escritorio_whatsapp` que liga/desliga cada tipo de aviso. */
export const CAMPO_AVISO_WHATSAPP: Record<TipoAvisoWhatsapp, keyof ConfigWhatsapp> = {
  atribuicao: "notif_atribuicao",
  status: "notif_status",
  comentario: "notif_comentario",
  prazo: "notif_prazo",
  compromisso: "notif_compromisso",
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

/** "Bom dia" / "Boa tarde" / "Boa noite" pelo horário de Brasília. */
export function saudacaoPorHorario(agora: Date = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      hourCycle: "h23",
    }).format(agora),
  );
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Monta a mensagem na voz do Nitro: cumprimenta pelo horário, chama o chefe
 * de "Chefe" e o funcionário pelo primeiro nome, e fecha com o link.
 */
export function montarMensagemNitro(opts: {
  nome: string | null;
  papel: string | null;
  corpo: string;
  link?: string | null;
}): string {
  const primeiroNome = opts.nome?.trim().split(/\s+/)[0];
  const vocativo = opts.papel === "chefe" ? "Chefe" : primeiroNome || null;
  const saudacao = `${saudacaoPorHorario()}${vocativo ? `, ${vocativo}` : ""}!`;
  return [saudacao, opts.corpo, opts.link ? `Abrir: ${opts.link}` : null]
    .filter(Boolean)
    .join("\n\n");
}

/** "2026-09-25" → "25/09". */
export function formatarDiaMes(dataISO: string): string {
  const [, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}`;
}
