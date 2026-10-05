import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { QuadroDemandas } from "@/app/(app)/dashboard/_componentes/quadro-demandas";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import {
  listarComentariosPorDemanda,
  type Comentario,
} from "@/lib/comentarios-consultas";
import { obterConfigDemandas } from "@/lib/demandas-config-consultas";
import { construirQuadro } from "@/lib/quadro-colunas";

export const metadata = { title: "Demandas dos funcionários" };

/**
 * Visão do chefe: as demandas dos funcionários (todas menos as próprias, que
 * ficam em "Meu Trabalho"), num board por status, com o nome do responsável
 * em cada card.
 */
export default async function PaginaDemandasEquipe({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const perfil = await requererEscritorio();
  if (perfil.papel !== "chefe") redirect("/dashboard");

  const { q: qBruto } = await searchParams;
  const busca = qBruto?.trim() || undefined;

  const [todas, config] = await Promise.all([
    listarDemandas(undefined, busca),
    obterConfigDemandas(),
  ]);
  const demandas = todas.filter((d) => d.usuario_id !== perfil.id);

  const comentariosMapa = await listarComentariosPorDemanda(
    demandas.map((d) => d.id),
  );
  const comentariosPorDemanda: Record<string, Comentario[]> =
    Object.fromEntries(comentariosMapa);

  const { colunas, cardsPorColuna } = construirQuadro(demandas, config);

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Demandas dos funcionários
          </h1>
          <p className="mt-0.5 text-sm text-fg-secondary">
            O que cada pessoa da equipe tem para fazer.
          </p>
        </div>
      </header>

      {busca && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius)] bg-surface-hover px-3.5 py-2 text-sm">
          <span className="text-fg-secondary">
            Resultados para <span className="text-foreground">“{busca}”</span>
          </span>
          <Link
            href="/dashboard/equipe"
            className="flex items-center gap-1 text-fg-tertiary transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Link>
        </div>
      )}

      <QuadroDemandas
        colunas={colunas}
        cardsPorColuna={cardsPorColuna}
        comentariosPorDemanda={comentariosPorDemanda}
        usuarioId={perfil.id}
        statuses={config.statuses}
        mostrarDono
      />
    </main>
  );
}
