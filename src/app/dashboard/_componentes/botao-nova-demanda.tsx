"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { criarDemanda } from "@/app/dashboard/actions";
import { FormularioDemanda } from "@/app/dashboard/_componentes/formulario-demanda";
import { Modal } from "@/app/dashboard/_componentes/modal";

export function BotaoNovaDemanda() {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="btn btn-primary brilho-hover"
      >
        <Plus className="h-4 w-4" />
        Nova demanda
      </button>

      {aberto && (
        <Modal titulo="Nova demanda" aoFechar={() => setAberto(false)}>
          <FormularioDemanda
            acao={criarDemanda}
            rotuloEnvio="Criar demanda"
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
