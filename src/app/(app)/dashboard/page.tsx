import Link from "next/link";
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
import { BotaoNovaDemanda } from "@/app/(app)/dashboard/_componentes/botao-nova-demanda";
import { listarQuadrosDeTarefas } from "@/lib/operacoes-consultas";
import { listarMembros } from "@/lib/escritorios-consultas";
import { colunasDoQuadro } from "@/lib/demandas-config";

export const metadata = { title: "Meu Trabalho" };

/**
 * "Meu Trabalho": as demandas do usuário logado, de todos os quadros, num
 * board por status. "Nova demanda" aqui pede o quadro onde criar, ou
 * "Geral" (demanda sem operação).
 */
export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const perfil = await requererEscritorio();
  const { q: qBruto } = await searchParams;
  const busca = qBruto?.trim() || undefined;

  const [demandas, config, quadros, membros] = await Promise.all([
    listarDemandas(undefined, busca, perfil.id),
    obterConfigDemandas(),
    listarQuadrosDeTarefas(),
    perfil.papel === "chefe" ? listarMembros() : Promise.resolve(undefined),
  ]);
  const opcoesQuadro = quadros.map((q) => ({
    id: q.id,
    nome: q.nome,
    operacao: q.operacao_nome,
    colunasExtras: colunasDoQuadro(config, q.colunas_demandas).filter(
      (c) => !c.sistema && c.ativo,
    ),
  }));
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
          <h1 className="text-2xl font-semibold tracking-tight">Meu Trabalho</h1>
          <p className="mt-0.5 text-sm text-fg-secondary">
            Suas demandas, em todos os quadros.
          </p>
        </div>
        <BotaoNovaDemanda
          usuarioId={perfil.id}
          membros={membros}
          statuses={config.statuses}
          quadros={opcoesQuadro}
        />
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
          usuarioId={perfil.id}
          statuses={config.statuses}
        />
      )}
    </main>
  );
}
