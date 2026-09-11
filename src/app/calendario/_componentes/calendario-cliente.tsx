"use client";

import dynamic from "next/dynamic";
import type { EventoDemanda } from "./calendario-demandas";
import type { Compromisso } from "@/lib/compromissos";

/**
 * O FullCalendar só funciona no navegador. Carregamos ele com `ssr: false`
 * para nada dele rodar no servidor (evita erros de render no SSR).
 */
const CalendarioDemandas = dynamic(() => import("./calendario-demandas"), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-fg-tertiary">Carregando calendário...</p>
  ),
});

export function CalendarioCliente({
  eventos,
  compromissos,
}: {
  eventos: EventoDemanda[];
  compromissos: Compromisso[];
}) {
  return <CalendarioDemandas eventos={eventos} compromissos={compromissos} />;
}
