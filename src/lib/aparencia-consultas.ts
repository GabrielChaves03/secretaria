import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import { arquivoDoFundo } from "@/lib/aparencia";

/**
 * URL da imagem de fundo do usuário logado (ou a padrão, se não houver
 * sessão ou o usuário nunca tiver escolhido uma). Usada no layout raiz —
 * roda em toda página, então nunca lança: sem sessão só cai no padrão.
 */
export async function obterUrlFundoAtual(): Promise<string> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return arquivoDoFundo(null);

  const { data } = await supabase
    .from("usuarios")
    .select("imagem_fundo")
    .eq("id", user.id)
    .maybeSingle();

  return arquivoDoFundo((data?.imagem_fundo as string | null) ?? null);
}
