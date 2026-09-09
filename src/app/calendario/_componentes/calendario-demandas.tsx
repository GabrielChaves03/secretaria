"use client";

import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventInput } from "@fullcalendar/core";
import type { Dificuldade } from "@/lib/demandas";

/** verde = fácil, amarelo = média, vermelho = difícil */
const COR_DIFICULDADE: Record<Dificuldade, string> = {
  facil: "#1db954",
  media: "#e0a63a",
  dificil: "#e5534b",
};

export type EventoDemanda = {
  id: string;
  titulo: string;
  data_entrega: string;
  dificuldade: Dificuldade;
};

export default function CalendarioDemandas({
  eventos,
}: {
  eventos: EventoDemanda[];
}) {
  const router = useRouter();

  const fcEventos: EventInput[] = eventos.map((e) => ({
    id: e.id,
    title: e.titulo,
    start: e.data_entrega,
    allDay: true,
    backgroundColor: COR_DIFICULDADE[e.dificuldade],
    borderColor: COR_DIFICULDADE[e.dificuldade],
  }));

  return (
    <FullCalendar
      plugins={[dayGridPlugin]}
      initialView="dayGridMonth"
      locale={ptBrLocale}
      height="auto"
      firstDay={0}
      headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
      buttonText={{ today: "Hoje" }}
      events={fcEventos}
      eventClick={(info) => {
        info.jsEvent.preventDefault();
        router.push(`/dashboard/${info.event.id}/editar`);
      }}
    />
  );
}
