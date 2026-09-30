"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventInput } from "@fullcalendar/core";
import type { Dificuldade } from "@/lib/demandas";
import type { Compromisso } from "@/lib/compromissos";
import { atualizarCompromisso, apagarCompromisso } from "@/app/(app)/calendario/actions";
import { FormularioCompromisso } from "./formulario-compromisso";
import { Modal } from "@/app/(app)/dashboard/_componentes/modal";

/** verde = fácil, amarelo = média, vermelho = difícil */
const COR_DIFICULDADE: Record<Dificuldade, string> = {
  facil: "#1db954",
  media: "#e0a63a",
  dificil: "#e5534b",
};

/** azul — diferencia compromisso (reunião) de demanda no calendário */
const COR_COMPROMISSO = "#4b8fe8";

export type EventoDemanda = {
  id: string;
  titulo: string;
  data_entrega: string;
  dificuldade: Dificuldade;
};

type PropsEvento =
  | { tipo: "demanda"; demandaId: string }
  | { tipo: "compromisso"; compromisso: Compromisso };

export default function CalendarioDemandas({
  eventos,
  compromissos,
}: {
  eventos: EventoDemanda[];
  compromissos: Compromisso[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Compromisso | null>(null);

  const fcEventos: EventInput[] = [
    ...eventos.map((e) => ({
      id: `d-${e.id}`,
      title: e.titulo,
      start: e.data_entrega,
      allDay: true,
      backgroundColor: COR_DIFICULDADE[e.dificuldade],
      borderColor: COR_DIFICULDADE[e.dificuldade],
      extendedProps: { tipo: "demanda", demandaId: e.id } satisfies PropsEvento,
    })),
    ...compromissos.map((c) => ({
      id: `c-${c.id}`,
      title: `🗓 ${c.titulo}`,
      start: c.data_hora,
      allDay: false,
      backgroundColor: COR_COMPROMISSO,
      borderColor: COR_COMPROMISSO,
      extendedProps: { tipo: "compromisso", compromisso: c } satisfies PropsEvento,
    })),
  ];

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        height="auto"
        aspectRatio={1.9}
        firstDay={0}
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        buttonText={{ today: "Hoje" }}
        events={fcEventos}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          const props = info.event.extendedProps as PropsEvento;
          if (props.tipo === "demanda") {
            router.push(`/dashboard/${props.demandaId}/editar`);
          } else {
            setEditando(props.compromisso);
          }
        }}
      />

      {editando && (
        <Modal titulo="Compromisso" aoFechar={() => setEditando(null)}>
          <FormularioCompromisso
            acao={atualizarCompromisso}
            compromisso={editando}
            rotuloEnvio="Salvar"
            aoConcluir={() => {
              setEditando(null);
              router.refresh();
            }}
          />
          <form
            action={async (formData) => {
              await apagarCompromisso(formData);
              setEditando(null);
              router.refresh();
            }}
            className="mt-3 border-t border-border pt-3"
          >
            <input type="hidden" name="id" value={editando.id} />
            <button type="submit" className="btn btn-danger btn-sm w-full">
              Excluir compromisso
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
