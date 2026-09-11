"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { criarCompromisso } from "@/app/calendario/actions";
import { FormularioCompromisso } from "./formulario-compromisso";
import { Modal } from "@/app/dashboard/_componentes/modal";

export function BotaoNovoCompromisso() {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="btn btn-primary brilho-hover"
      >
        <CalendarPlus className="h-4 w-4" />
        Novo compromisso
      </button>

      {aberto && (
        <Modal titulo="Novo compromisso" aoFechar={() => setAberto(false)}>
          <FormularioCompromisso
            acao={criarCompromisso}
            rotuloEnvio="Criar compromisso"
            aoConcluir={() => {
              setAberto(false);
              router.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
