import Link from "next/link";
import { X } from "lucide-react";
import { BotaoNovaDemanda } from "@/app/(app)/dashboard/_componentes/botao-nova-demanda";
import { QuadroDemandas } from "@/app/(app)/dashboard/_componentes/quadro-demandas";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { listarListas } from "@/lib/listas-consultas";
import { listarMembros } from "@/lib/escritorios-consultas";
import {
  listarComentariosPorDemanda,
  type Comentario,
} from "@/lib/comentarios-consultas";
import { construirQuadro } from "@/lib/quadro-colunas";

export const metadata = { title: "Demandas" };

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const perfil = await requererEscritorio();
  const { q: qBruto } = await searchParams;
  const busca = qBruto?.trim() || undefined;
  const ehChefe = perfil.papel === "chefe";

  // Quadro pessoal: só o que é da própria pessoa. (O chefe enxerga tudo pela
  // RLS — as demandas dos funcionários ficam em /dashboard/equipe.)
  const [demandas, listas, membros] = await Promise.all([
    listarDemandas(undefined, busca, perfil.id),
    listarListas(perfil.id),
    ehChefe ? listarMembros() : Promise.resolve(undefined),
  ]);
  const comentariosMapa = await listarComentariosPorDemanda(
    demandas.map((d) => d.id),
  );

  const { colunas, cardsPorColuna } = construirQuadro(
    demandas,
    listas.map((l) => ({ id: l.id, nome: l.nome })),
  );

  const comentariosPorDemanda: Record<string, Comentario[]> =
    Object.fromEntries(comentariosMapa);

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ehChefe ? "Demandas pessoais" : "Demandas"}
          </h1>
          <p className="mt-0.5 text-sm text-fg-secondary">Suas demandas.</p>
        </div>
        <BotaoNovaDemanda membros={membros} usuarioId={perfil.id} />
      </header>

      {busca && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius)] bg-surface-hover px-3.5 py-2 text-sm">
          <span className="text-fg-secondary">
            Resultados para <span className="text-foreground">“{busca}”</span>
            <span className="text-fg-tertiary"> · {demandas.length}</span>
          </span>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-fg-tertiary transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Link>
        </div>
      )}

      {busca && demandas.length === 0 ? (
        <div className="cartao mt-4 px-5 py-10 text-center text-sm text-fg-tertiary">
          Nenhuma demanda encontrada para “{busca}”.
        </div>
      ) : (
        <QuadroDemandas
          colunas={colunas}
          cardsPorColuna={cardsPorColuna}
          comentariosPorDemanda={comentariosPorDemanda}
          listas={listas.map((l) => ({ id: l.id, nome: l.nome }))}
          usuarioId={perfil.id}
        />
      )}
    </main>
  );
}
