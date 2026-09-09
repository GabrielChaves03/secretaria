import Link from "next/link";
import { X } from "lucide-react";
import { BotaoNovaDemanda } from "@/app/dashboard/_componentes/botao-nova-demanda";
import {
  QuadroDemandas,
  type CartaoDemanda,
  type ColunaQuadro,
} from "@/app/dashboard/_componentes/quadro-demandas";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { listarListas } from "@/lib/listas-consultas";
import {
  listarComentariosPorDemanda,
  type Comentario,
} from "@/lib/comentarios-consultas";
import type { DemandaComDono } from "@/lib/demandas";

export const metadata = { title: "Demandas" };

/** Data de hoje no formato YYYY-MM-DD, no fuso de São Paulo. */
function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

type ChaveAuto = "em_andamento" | "concluida" | "pendente";

const COLUNAS_AUTO: {
  chave: ChaveAuto;
  titulo: string;
  dot: string;
  barra: string;
}[] = [
  {
    chave: "em_andamento",
    titulo: "Em andamento",
    dot: "bg-[#e0a63a]",
    barra: "coluna-em-andamento",
  },
  { chave: "concluida", titulo: "Concluídas", dot: "bg-accent", barra: "coluna-concluida" },
  { chave: "pendente", titulo: "Pendentes", dot: "bg-danger", barra: "coluna-pendente" },
];

/**
 * Coluna automática de uma demanda:
 * - Concluídas: status "concluida";
 * - Pendentes: não concluída (iniciada ou não) e com o prazo de entrega vencido;
 * - Em andamento: as demais (sem prazo, ou prazo ainda no futuro).
 */
function colunaAutoDe(d: DemandaComDono, hoje: string): ChaveAuto {
  if (d.status === "concluida") return "concluida";
  if (d.data_entrega && d.data_entrega < hoje) return "pendente";
  return "em_andamento";
}

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const perfil = await requererEscritorio();
  const { q: qBruto } = await searchParams;
  const busca = qBruto?.trim() || undefined;
  const ehChefe = perfil.papel === "chefe";

  const [demandas, listas] = await Promise.all([
    listarDemandas(undefined, busca),
    listarListas(),
  ]);
  const comentariosMapa = await listarComentariosPorDemanda(
    demandas.map((d) => d.id),
  );

  const hoje = hojeISO();
  const listasVisiveis = new Set(listas.map((l) => l.id));

  // Colunas do quadro: 3 automáticas + uma por lista personalizada.
  // `token` = chave de agrupamento/identidade; `destino` = o que `moverDemanda`
  // recebe ao soltar (troca de status nas automáticas, lista_id nas listas).
  const colunas: ColunaQuadro[] = [
    ...COLUNAS_AUTO.map((c) => ({
      token: `auto:${c.chave}`,
      destino: `status:${c.chave}`,
      titulo: c.titulo,
      tipo: "auto" as const,
      dot: c.dot,
      barra: c.barra,
    })),
    ...listas.map((l) => ({
      token: `lista:${l.id}`,
      destino: `lista:${l.id}`,
      titulo: l.nome,
      tipo: "lista" as const,
      listaId: l.id,
    })),
  ];

  // Distribui as demandas pelas colunas.
  const cardsPorColuna: Record<string, CartaoDemanda[]> = {};
  for (const col of colunas) cardsPorColuna[col.token] = [];

  for (const d of demandas) {
    const naLista = d.lista_id && listasVisiveis.has(d.lista_id);
    const tokenAtual = naLista
      ? `lista:${d.lista_id}`
      : `auto:${colunaAutoDe(d, hoje)}`;
    const card: CartaoDemanda = {
      ...d,
      atrasada:
        d.status !== "concluida" &&
        !!d.data_entrega &&
        d.data_entrega < hoje,
      tokenAtual,
    };
    (cardsPorColuna[tokenAtual] ??= []).push(card);
  }

  const comentariosPorDemanda: Record<string, Comentario[]> =
    Object.fromEntries(comentariosMapa);

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Demandas</h1>
          <p className="mt-0.5 text-sm text-fg-secondary">
            {ehChefe ? "Todas as demandas da equipe." : "Suas demandas."}
          </p>
        </div>
        <BotaoNovaDemanda />
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
          ehChefe={ehChefe}
          usuarioId={perfil.id}
        />
      )}
    </main>
  );
}
