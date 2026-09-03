import type { ReactNode } from "react";
import { BarraLateral } from "@/app/_componentes/barra-lateral";
import { obterPerfil } from "@/lib/perfil-consultas";
import { contarNaoLidas } from "@/lib/notificacoes-consultas";

/**
 * Casca da área logada: barra lateral (Notion-like) + conteúdo.
 * Usada pelo layout de /dashboard e pela página /calendario.
 */
export async function CascaApp({ children }: { children: ReactNode }) {
  const [perfil, naoLidas] = await Promise.all([
    obterPerfil(),
    contarNaoLidas(),
  ]);

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <BarraLateral
        nome={perfil.nome ?? perfil.email}
        ehChefe={perfil.papel === "chefe"}
        naoLidas={naoLidas}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
