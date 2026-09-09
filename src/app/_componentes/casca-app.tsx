import type { ReactNode } from "react";
import { BarraTopo } from "@/app/_componentes/barra-topo";
import { BarraLateral } from "@/app/_componentes/barra-lateral";
import { obterPerfil } from "@/lib/perfil-consultas";
import {
  contarNaoLidas,
  listarNotificacoes,
} from "@/lib/notificacoes-consultas";

/**
 * Casca da área logada: barra do topo (logo + busca + notificações + perfil),
 * barra lateral de navegação e o conteúdo. Usada pelo layout de /dashboard e
 * pela página /calendario.
 */
export async function CascaApp({ children }: { children: ReactNode }) {
  const [perfil, naoLidas, notificacoes] = await Promise.all([
    obterPerfil(),
    contarNaoLidas(),
    listarNotificacoes(),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BarraTopo
        nome={perfil.nome ?? perfil.email}
        email={perfil.email}
        papel={perfil.papel}
        naoLidas={naoLidas}
        notificacoes={notificacoes}
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <BarraLateral />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
