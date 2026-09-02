"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  DIFICULDADES,
  ROTULO_DIFICULDADE,
  type Demanda,
} from "@/lib/demandas";
import type { EstadoDemanda } from "@/app/dashboard/actions";

const CAMPO =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700";

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
    <form action={acaoForm} className="space-y-4">
      {demanda && <input type="hidden" name="id" value={demanda.id} />}

      <div className="space-y-1">
        <label htmlFor="titulo" className="text-sm font-medium">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          defaultValue={demanda?.titulo ?? ""}
          className={CAMPO}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="descricao" className="text-sm font-medium">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          defaultValue={demanda?.descricao ?? ""}
          className={CAMPO}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="data_entrega" className="text-sm font-medium">
          Data de entrega
        </label>
        <input
          id="data_entrega"
          name="data_entrega"
          type="date"
          defaultValue={demanda?.data_entrega ?? ""}
          className={CAMPO}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="dificuldade" className="text-sm font-medium">
          Dificuldade
        </label>
        <select
          id="dificuldade"
          name="dificuldade"
          defaultValue={demanda?.dificuldade ?? "media"}
          className={CAMPO}
        >
          {DIFICULDADES.map((d) => (
            <option key={d} value={d}>
              {ROTULO_DIFICULDADE[d]}
            </option>
          ))}
        </select>
      </div>

      {estado?.erro && (
        <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pendente ? "Salvando..." : rotuloEnvio}
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
