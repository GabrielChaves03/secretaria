import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, X } from "lucide-react";
import { BotaoNovaDemanda } from "@/app/(app)/dashboard/_componentes/botao-nova-demanda";
import {
  QuadroDemandas,
  type CartaoDemanda,
  type ColunaQuadro,
} from "@/app/(app)/dashboard/_componentes/quadro-demandas";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { listarMembros } from "@/lib/escritorios-consultas";
import {
  listarComentariosPorDemanda,
  type Comentario,
} from "@/lib/comentarios-consultas";
import { estaAtrasada, hojeISO, type DemandaComDono } from "@/lib/demandas";

export const metadata = { title: "Demandas dos funcionários" };

/** Filtros do topo. "pendentes" = atrasadas (mesma regra da coluna Pendentes). */
const FILTROS = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "a_iniciar", rotulo: "A iniciar" },
  { chave: "em_andamento", rotulo: "Em andamento" },
  { chave: "concluidas", rotulo: "Concluídas" },
  { chave: "pendentes", rotulo: "Pendentes" },
] as const;
type ChaveFiltro = (typeof FILTROS)[number]["chave"];

/** Situação de uma demanda — decide o filtro e a cor da faixa do card. */
function situacaoDe(d: DemandaComDono, hoje: string): Exclude<ChaveFiltro, "todas"> {
  if (d.status === "concluida") return "concluidas";
  if (estaAtrasada(d, hoje)) return "pendentes";
  return d.status === "pendente" ? "a_iniciar" : "em_andamento";
}

const BARRA: Record<Exclude<ChaveFiltro, "todas">, string> = {
  a_iniciar: "coluna-a-iniciar",
  em_andamento: "coluna-em-andamento",
  concluidas: "coluna-concluida",
  pendentes: "coluna-pendente",
};

/**
 * Visão do chefe: uma coluna por funcionário do escritório, com as demandas
 * dele embaixo (mesmo card do quadro). Filtro por situação no topo.
 */
export default async function PaginaDemandasEquipe({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  const perfil = await requererEscritorio();
  if (perfil.papel !== "chefe") redirect("/dashboard");

  const { filtro: filtroBruto, q: qBruto } = await searchParams;
  const filtro: ChaveFiltro = FILTROS.some((f) => f.chave === filtroBruto)
    ? (filtroBruto as ChaveFiltro)
    : "todas";
  const busca = qBruto?.trim() || undefined;

  const [todas, membros] = await Promise.all([
    listarDemandas(undefined, busca),
    listarMembros(),
  ]);

  // Colunas = todos os membros menos o próprio chefe (as dele ficam no quadro pessoal).
  const pessoas = membros.filter((m) => m.id !== perfil.id);
  const idsPessoas = new Set(pessoas.map((p) => p.id));

  const hoje = hojeISO();
  const daEquipe = todas.filter((d) => idsPessoas.has(d.usuario_id));

  const contagem: Record<ChaveFiltro, number> = {
    todas: daEquipe.length,
    a_iniciar: 0,
    em_andamento: 0,
    concluidas: 0,
    pendentes: 0,
  };
  for (const d of daEquipe) contagem[situacaoDe(d, hoje)]++;

  const colunas: ColunaQuadro[] = pessoas.map((p) => ({
    token: `pessoa:${p.id}`,
    destino: "",
    titulo: p.nome ?? "Sem nome",
    tipo: "auto" as const,
  }));

  const cardsPorColuna: Record<string, CartaoDemanda[]> = {};
  for (const col of colunas) cardsPorColuna[col.token] = [];
  for (const d of daEquipe) {
    const situacao = situacaoDe(d, hoje);
    if (filtro !== "todas" && situacao !== filtro) continue;
    const token = `pessoa:${d.usuario_id}`;
    cardsPorColuna[token]?.push({
      ...d,
      atrasada: estaAtrasada(d, hoje),
      barra: BARRA[situacao],
      tokenAtual: token,
    });
  }

  const comentariosMapa = await listarComentariosPorDemanda(
    daEquipe.map((d) => d.id),
  );
  const comentariosPorDemanda: Record<string, Comentario[]> =
    Object.fromEntries(comentariosMapa);

  const responsavelPadrao = pessoas.find((p) => p.papel === "funcionario")?.id;

  /** Link de filtro (preserva a busca, a menos que `semBusca`). */
  function hrefFiltro(chave: ChaveFiltro, semBusca = false) {
    const p = new URLSearchParams();
    if (chave !== "todas") p.set("filtro", chave);
    if (busca && !semBusca) p.set("q", busca);
    const qs = p.toString();
    return `/dashboard/equipe${qs ? `?${qs}` : ""}`;
  }

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
        {pessoas.length > 0 && (
          <BotaoNovaDemanda
            membros={membros}
            usuarioId={perfil.id}
            responsavelPadrao={responsavelPadrao}
          />
        )}
      </header>

      {pessoas.length > 0 && (
        <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Filtrar demandas">
          {FILTROS.map((f) => {
            const ativo = f.chave === filtro;
            return (
              <Link
                key={f.chave}
                href={hrefFiltro(f.chave)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                  ativo
                    ? "bg-surface-active font-medium text-foreground shadow-[inset_0_0_0_1px_var(--accent)]"
                    : "text-fg-secondary shadow-[inset_0_0_0_1px_var(--border)] hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {f.rotulo}
                <span className="rounded-full bg-surface-hover px-1.5 text-xs text-fg-tertiary">
                  {contagem[f.chave]}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {busca && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius)] bg-surface-hover px-3.5 py-2 text-sm">
          <span className="text-fg-secondary">
            Resultados para <span className="text-foreground">“{busca}”</span>
          </span>
          <Link
            href={hrefFiltro(filtro, true)}
            className="flex items-center gap-1 text-fg-tertiary transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Link>
        </div>
      )}

      {pessoas.length === 0 ? (
        <div className="cartao mt-4 flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-fg-tertiary">
          <Users className="h-5 w-5" strokeWidth={1.5} />
          <p>Ainda não há funcionários neste escritório.</p>
          <Link href="/escritorio" className="text-accent hover:underline">
            Convide a equipe com o código do escritório
          </Link>
        </div>
      ) : (
        <QuadroDemandas
          modo="equipe"
          colunas={colunas}
          cardsPorColuna={cardsPorColuna}
          comentariosPorDemanda={comentariosPorDemanda}
          listas={[]}
          usuarioId={perfil.id}
        />
      )}
    </main>
  );
}
