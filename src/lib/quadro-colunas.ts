import "server-only";

import { colunaAutoDe, hojeISO, type DemandaComDono } from "@/lib/demandas";
import type {
  CartaoDemanda,
  ColunaQuadro,
} from "@/app/(app)/dashboard/_componentes/quadro-demandas";

/** Colunas automáticas por status/prazo (as 3 reais + "Pendentes" por prazo). */
export const COLUNAS_AUTO: {
  chave: "a_iniciar" | "em_andamento" | "concluida" | "atrasada";
  /** Status que a demanda ganha ao ser solta aqui; "" = só por prazo. */
  status: string;
  titulo: string;
  dot: string;
  barra: string;
}[] = [
  { chave: "a_iniciar", status: "pendente", titulo: "A iniciar", dot: "bg-[#5b8def]", barra: "coluna-a-iniciar" },
  { chave: "em_andamento", status: "em_andamento", titulo: "Em andamento", dot: "bg-[#e0a63a]", barra: "coluna-em-andamento" },
  { chave: "concluida", status: "concluida", titulo: "Concluídas", dot: "bg-accent", barra: "coluna-concluida" },
  { chave: "atrasada", status: "", titulo: "Pendentes", dot: "bg-danger", barra: "coluna-pendente" },
];

/**
 * Monta as colunas do quadro (3 automáticas + "Pendentes" + 1 por lista) e
 * distribui as demandas. Usado pelo quadro pessoal e pela página de um quadro.
 */
export function construirQuadro(
  demandas: DemandaComDono[],
  listas: { id: string; nome: string }[],
  hoje: string = hojeISO(),
): { colunas: ColunaQuadro[]; cardsPorColuna: Record<string, CartaoDemanda[]> } {
  const listasVisiveis = new Set(listas.map((l) => l.id));

  const colunas: ColunaQuadro[] = [
    ...COLUNAS_AUTO.map((c) => ({
      token: `auto:${c.chave}`,
      destino: c.status ? `status:${c.status}` : "",
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

  const cardsPorColuna: Record<string, CartaoDemanda[]> = {};
  for (const col of colunas) cardsPorColuna[col.token] = [];

  for (const d of demandas) {
    const naLista = d.lista_id && listasVisiveis.has(d.lista_id);
    const token = naLista ? `lista:${d.lista_id}` : `auto:${colunaAutoDe(d, hoje)}`;
    const card: CartaoDemanda = {
      ...d,
      atrasada: d.status !== "concluida" && !!d.data_entrega && d.data_entrega < hoje,
      tokenAtual: token,
    };
    (cardsPorColuna[token] ??= []).push(card);
  }

  return { colunas, cardsPorColuna };
}
