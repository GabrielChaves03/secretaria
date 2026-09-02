import { type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

/**
 * "Proxy" é o novo nome do antigo `middleware` a partir do Next.js 16
 * (mesma funcionalidade). Roda no servidor antes de cada requisição.
 */
export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, exceto:
     * - _next/static, _next/image (assets internos)
     * - favicon.ico e arquivos de imagem
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
