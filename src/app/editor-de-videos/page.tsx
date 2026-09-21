import { requererEscritorio } from "@/lib/perfil-consultas";
import { ehAdmin } from "@/lib/admin";
import { listarPedidosVideo, listarFilaGlobalAdmin } from "@/lib/video-pedidos-consultas";
import { FormularioEnvioVideo } from "./_componentes/formulario-envio";
import { ListaPedidos } from "./_componentes/lista-pedidos";
import { FilaAdmin } from "./_componentes/fila-admin";

export const metadata = { title: "Editor de Vídeos" };

export default async function PaginaEditorDeVideos() {
  const perfil = await requererEscritorio();
  const admin = ehAdmin(perfil.email);

  const [pedidos, fila] = await Promise.all([
    listarPedidosVideo(),
    admin ? listarFilaGlobalAdmin() : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Editor de Vídeos</h1>
        <p className="mt-0.5 text-sm text-fg-secondary">
          Envie um vídeo e as instruções de edição. Um vídeo editado aparece
          aqui quando estiver pronto.
        </p>
      </header>

      <div className="mt-6">
        <FormularioEnvioVideo />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold">Seus pedidos</h2>
        <div className="mt-3">
          <ListaPedidos pedidos={pedidos} />
        </div>
      </div>

      {admin && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-semibold">Fila de todos os escritórios</h2>
          <p className="mt-1 text-xs text-fg-tertiary">
            Só você vê esta seção (ADMIN_EMAILS). Baixe o original, edite pelo
            Claude Code local e suba o resultado aqui.
          </p>
          <div className="mt-3">
            <FilaAdmin fila={fila} />
          </div>
        </div>
      )}
    </main>
  );
}
