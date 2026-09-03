"use client";

import Link from "next/link";
import { useActionState } from "react";
import { DIFICULDADES, ROTULO_DIFICULDADE, type Demanda } from "@/lib/demandas";
import type { EstadoDemanda } from "@/app/dashboard/actions";

type Props = {
  acao: (
    estado: EstadoDemanda,
    formData: FormData,
  ) => Promise<EstadoDemanda>;
  /** Quando presente, o formulário edita esta demanda em vez de criar. */
  demanda?: Demanda;
  rotuloEnvio: string;
};

export function FormularioDemanda({ acao, demanda, rotuloEnvio }: Props) {
  const [estado, acaoForm, pendente] = useActionState<EstadoDemanda, FormData>(
    acao,
    undefined,
  );

  return (
    <form action={acaoForm} className="space-y-5">
      {demanda && <input type="hidden" name="id" value={demanda.id} />}

      <div className="space-y-1.5">
        <label htmlFor="titulo" className="rotulo block">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          defaultValue={demanda?.titulo ?? ""}
          className="campo"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="descricao" className="rotulo block">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          defaultValue={demanda?.descricao ?? ""}
          className="campo resize-y"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="data_entrega" className="rotulo block">
            Data de entrega
          </label>
          <input
            id="data_entrega"
            name="data_entrega"
            type="date"
            defaultValue={demanda?.data_entrega ?? ""}
            className="campo"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dificuldade" className="rotulo block">
            Dificuldade
          </label>
          <select
            id="dificuldade"
            name="dificuldade"
            defaultValue={demanda?.dificuldade ?? "media"}
            className="campo"
          >
            {DIFICULDADES.map((d) => (
              <option key={d} value={d}>
                {ROTULO_DIFICULDADE[d]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {estado?.erro && (
        <p className="text-sm text-danger">{estado.erro}</p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="btn btn-primary">
          {pendente ? "Salvando..." : rotuloEnvio}
        </button>
        <Link href="/dashboard" className="btn btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
