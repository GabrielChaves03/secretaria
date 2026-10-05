"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { criarDemanda } from "@/app/(app)/dashboard/actions";
import { FormularioDemanda } from "@/app/(app)/dashboard/_componentes/formulario-demanda";
import { Modal } from "@/app/(app)/dashboard/_componentes/modal";
import type { Membro } from "@/lib/escritorios";

export function BotaoNovaDemanda({
  membros,
  usuarioId,
  responsavelPadrao,
  quadroId,
}: {
  /** Só para o chefe — habilita o seletor de responsável. */
  membros?: Pick<Membro, "id" | "nome">[];
  usuarioId: string;
  /** Quem vem selecionado no seletor (padrão: o próprio usuário). */
  responsavelPadrao?: string;
  /** Quadro onde a demanda será criada. */
  quadroId?: string;
}) {
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
            membros={membros}
            usuarioId={usuarioId}
            responsavelPadrao={responsavelPadrao}
            quadroId={quadroId}
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
