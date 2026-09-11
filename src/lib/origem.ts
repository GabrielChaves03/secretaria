import "server-only";

import { headers } from "next/headers";

/**
 * Origem (protocolo + host) da requisição atual, pra montar links absolutos
 * (redirectTo de e-mails de auth). Usa os cabeçalhos de proxy do Netlify em
 * produção; cai pra http local em dev.
 */
export async function obterOrigem() {
  const cabecalhos = await headers();
  const proto = cabecalhos.get("x-forwarded-proto") ?? "http";
  const host = cabecalhos.get("host");
  return `${proto}://${host}`;
}
