import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BotaoNovaDemanda } from "@/app/(app)/dashboard/_componentes/botao-nova-demanda";
import { QuadroDemandas } from "@/app/(app)/dashboard/_componentes/quadro-demandas";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { listarMembros } from "@/lib/escritorios-consultas";
import {
  listarComentariosPorDemanda,
  type Comentario,
} from "@/lib/comentarios-consultas";
import { obterOperacao, obterQuadro } from "@/lib/operacoes-consultas";
import { obterConfigDemandas } from "@/lib/demandas-config-consultas";
import { construirQuadro } from "@/lib/quadro-colunas";

export const metadata = { title: "Quadro" };

export default async function PaginaQuadro({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await requererEscritorio();
  const { id } = await params;
  const ehChefe = perfil.papel === "chefe";

  const quadro = await obterQuadro(id);
  if (!quadro) notFound();
  const operacao = await obterOperacao(quadro.operacao_id);

  const [demandas, membros, config] = await Promise.all([
    listarDemandas(undefined, undefined, undefined, id),
    ehChefe ? listarMembros() : Promise.resolve(undefined),
    obterConfigDemandas(),
  ]);
  const comentariosMapa = await listarComentariosPorDemanda(
    demandas.map((d) => d.id),
  );
  const comentariosPorDemanda: Record<string, Comentario[]> =
    Object.fromEntries(comentariosMapa);

  const { colunas, cardsPorColuna } = construirQuadro(demandas, config);
  const responsavelPadrao = membros?.find((m) => m.papel === "funcionario")?.id;

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-fg-tertiary">
            {operacao && (
              <>
                <span
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: operacao.cor }}
                />
                <span>{operacao.nome}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </div>
          <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="h-3 w-3 rounded-full" style={{ background: quadro.cor }} />
            {quadro.nome}
          </h1>
        </div>
        <BotaoNovaDemanda
          membros={membros}
          usuarioId={perfil.id}
          responsavelPadrao={responsavelPadrao}
          quadroId={quadro.id}
          statuses={config.statuses}
        />
      </header>

      <QuadroDemandas
        colunas={colunas}
        cardsPorColuna={cardsPorColuna}
        comentariosPorDemanda={comentariosPorDemanda}
        usuarioId={perfil.id}
        statuses={config.statuses}
        mostrarDono={ehChefe}
      />
    </main>
  );
}
