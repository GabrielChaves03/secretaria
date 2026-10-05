import "server-only";

import { estaAtrasada, hojeISO, type DemandaComDono } from "@/lib/demandas";
import { corDoStatus, type ConfigDemandas } from "@/lib/demandas-config";
import type {
  CartaoDemanda,
  ColunaQuadro,
} from "@/app/(app)/dashboard/_componentes/quadro-demandas";

/**
 * Monta as colunas do board (uma por status configurado) e distribui as
 * demandas. Status fora da config caem na primeira coluna. Usado pelo quadro,
 * pelo "Meu Trabalho" (pessoal) e pela visão da equipe.
 */
export function construirQuadro(
  demandas: DemandaComDono[],
  config: ConfigDemandas,
  hoje: string = hojeISO(),
): { colunas: ColunaQuadro[]; cardsPorColuna: Record<string, CartaoDemanda[]> } {
  const colunas: ColunaQuadro[] = config.statuses.map((s) => ({
    token: `status:${s}`,
    destino: `status:${s}`,
    titulo: s,
    cor: corDoStatus(config, s),
  }));

  const cardsPorColuna: Record<string, CartaoDemanda[]> = {};
  for (const col of colunas) cardsPorColuna[col.token] = [];

  const primeiro = config.statuses[0];
  for (const d of demandas) {
    const col = config.statuses.includes(d.status) ? d.status : primeiro;
    const token = `status:${col}`;
    const card: CartaoDemanda = {
      ...d,
      atrasada: estaAtrasada(d, hoje),
      tokenAtual: token,
    };
    (cardsPorColuna[token] ??= []).push(card);
  }

  return { colunas, cardsPorColuna };
}
