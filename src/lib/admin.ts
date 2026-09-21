/**
 * Checagem de e-mails com acesso administrativo (`ADMIN_EMAILS`, separados
 * por vírgula). Client-safe (sem import de servidor) porque só lê
 * `process.env` — usado tanto em Server Components (Ajustes → "Reativar
 * sistema") quanto em Server Actions (fila global do Editor de Vídeos).
 */
export function ehAdmin(email: string): boolean {
  const lista = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}
