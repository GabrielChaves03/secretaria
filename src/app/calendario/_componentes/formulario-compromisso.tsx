"use client";

import { useActionState, useEffect } from "react";
import type { Compromisso } from "@/lib/compromissos";
import type { EstadoCompromisso } from "@/app/calendario/actions";

/** yyyy-mm-dd e HH:mm no fuso de São Paulo, a partir de um ISO — pra preencher os campos ao editar. */
function paraCamposLocais(iso: string) {
  const data = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return { data, hora };
}

export function FormularioCompromisso({
  acao,
  compromisso,
  rotuloEnvio,
  aoConcluir,
}: {
  acao: (
    estado: EstadoCompromisso,
    formData: FormData,
  ) => Promise<EstadoCompromisso>;
  /** Quando presente, o formulário edita este compromisso em vez de criar. */
  compromisso?: Compromisso;
  rotuloEnvio: string;
  aoConcluir?: () => void;
}) {
  const [estado, acaoForm, pendente] = useActionState<
    EstadoCompromisso,
    FormData
  >(acao, undefined);

  const sucesso = !!estado && "ok" in estado && estado.ok;

  useEffect(() => {
    if (sucesso && aoConcluir) aoConcluir();
  }, [sucesso, aoConcluir]);

  const iniciais = compromisso ? paraCamposLocais(compromisso.data_hora) : null;

  return (
    <form action={acaoForm} className="space-y-4">
      {compromisso && (
        <input type="hidden" name="id" value={compromisso.id} />
      )}

      <div className="space-y-1.5">
        <label htmlFor="titulo" className="rotulo block">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          autoFocus
          placeholder="Reunião com o cliente…"
          defaultValue={compromisso?.titulo ?? ""}
          className="campo"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="data" className="rotulo block">
            Data
          </label>
          <input
            id="data"
            name="data"
            type="date"
            required
            defaultValue={iniciais?.data ?? ""}
            className="campo"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="hora" className="rotulo block">
            Horário
          </label>
          <input
            id="hora"
            name="hora"
            type="time"
            required
            defaultValue={iniciais?.hora ?? ""}
            className="campo"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="descricao" className="rotulo block">
          Descrição (opcional)
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={compromisso?.descricao ?? ""}
          className="campo resize-none"
        />
      </div>

      {estado && "erro" in estado && (
        <p className="text-sm text-danger">{estado.erro}</p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="btn btn-primary w-full"
      >
        {pendente ? "Salvando..." : rotuloEnvio}
      </button>
    </form>
  );
}
