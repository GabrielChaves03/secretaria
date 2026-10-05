"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import {
  QuadroDemandas,
  type CartaoDemanda,
  type ColunaQuadro,
} from "@/app/(app)/dashboard/_componentes/quadro-demandas";
import { BoardTabela } from "@/app/(app)/dashboard/_componentes/board-tabela";
import { estaAtrasada, type DemandaComDono } from "@/lib/demandas";
import { corDoStatus, type ConfigDemandas } from "@/lib/demandas-config";
import type { Comentario } from "@/lib/comentarios-consultas";
import type { Membro } from "@/lib/escritorios";

/** Alterna entre a visão Tabela (grupos) e a visão Kanban (por status). */
export function VisaoQuadro({
  quadroId,
  demandas,
  config,
  grupos,
  membros,
  usuarioId,
  ehChefe,
  hoje,
  comentariosPorDemanda,
}: {
  quadroId: string;
  demandas: DemandaComDono[];
  config: ConfigDemandas;
  grupos: { ordem: string[]; cores: Record<string, string>; primeiro: string };
  membros?: Pick<Membro, "id" | "nome" | "papel">[];
  usuarioId: string;
  ehChefe: boolean;
  hoje: string;
  comentariosPorDemanda: Record<string, Comentario[]>;
}) {
  const [vista, setVista] = useState<"tabela" | "kanban">("tabela");

  const { colunas, cardsPorColuna } = useMemo(() => {
    const cols: ColunaQuadro[] = config.statuses.map((s) => ({
      token: `status:${s}`,
      destino: `status:${s}`,
      titulo: s,
      cor: corDoStatus(config, s),
    }));
    const mapa: Record<string, CartaoDemanda[]> = {};
    for (const c of cols) mapa[c.token] = [];
    const primeiro = config.statuses[0];
    for (const d of demandas) {
      const col = config.statuses.includes(d.status) ? d.status : primeiro;
      const token = `status:${col}`;
      (mapa[token] ??= []).push({
        ...d,
        atrasada: estaAtrasada(d, hoje),
        tokenAtual: token,
      });
    }
    return { colunas: cols, cardsPorColuna: mapa };
  }, [demandas, config, hoje]);

  return (
    <div className="mt-3">
      <div className="inline-flex rounded-[var(--radius)] bg-surface-hover p-0.5 text-sm">
        <BotaoVista
          ativo={vista === "tabela"}
          onClick={() => setVista("tabela")}
          Icone={Table2}
          rotulo="Tabela"
        />
        <BotaoVista
          ativo={vista === "kanban"}
          onClick={() => setVista("kanban")}
          Icone={LayoutGrid}
          rotulo="Kanban"
        />
      </div>

      {vista === "tabela" ? (
        <BoardTabela
          quadroId={quadroId}
          demandas={demandas}
          config={config}
          grupos={grupos}
          membros={membros}
          usuarioId={usuarioId}
          ehChefe={ehChefe}
          hoje={hoje}
        />
      ) : (
        <QuadroDemandas
          colunas={colunas}
          cardsPorColuna={cardsPorColuna}
          comentariosPorDemanda={comentariosPorDemanda}
          usuarioId={usuarioId}
          statuses={config.statuses}
          mostrarDono={ehChefe}
        />
      )}
    </div>
  );
}

function BotaoVista({
  ativo,
  onClick,
  Icone,
  rotulo,
}: {
  ativo: boolean;
  onClick: () => void;
  Icone: typeof Table2;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 transition-colors ${
        ativo
          ? "bg-surface font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
          : "text-fg-secondary hover:text-foreground"
      }`}
    >
      <Icone className="h-3.5 w-3.5" />
      {rotulo}
    </button>
  );
}
