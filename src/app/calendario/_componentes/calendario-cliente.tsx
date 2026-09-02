"use client";

import dynamic from "next/dynamic";
import type { EventoDemanda } from "./calendario-demandas";

/**
 * O FullCalendar só funciona no navegador. Carregamos ele com `ssr: false`
 * para nada dele rodar no servidor (evita erros de render no SSR).
 */
const CalendarioDemandas = dynamic(() => import("./calendario-demandas"), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-zinc-500">Carregando calendário...</p>
  ),
});

export function CalendarioCliente({ eventos }: { eventos: EventoDemanda[] }) {
  return <CalendarioDemandas eventos={eventos} />;
}
