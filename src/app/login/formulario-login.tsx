"use client";

import { useActionState } from "react";
import { entrar, type EstadoFormulario } from "@/app/auth/actions";

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    entrar,
    undefined,
  );

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="senha" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
        />
      </div>

      {estado?.erro && (
        <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
