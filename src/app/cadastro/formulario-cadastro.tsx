"use client";

import { useActionState } from "react";
import { cadastrar, type EstadoFormulario } from "@/app/auth/actions";

const CAMPO =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700";

export function FormularioCadastro() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    cadastrar,
    undefined,
  );

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="nome" className="text-sm font-medium">
          Nome
        </label>
        <input id="nome" name="nome" type="text" required className={CAMPO} />
      </div>

      <div className="space-y-1">
        <label htmlFor="telefone" className="text-sm font-medium">
          Telefone
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          autoComplete="tel"
          className={CAMPO}
        />
      </div>

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
          className={CAMPO}
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
          autoComplete="new-password"
          minLength={8}
          required
          className={CAMPO}
        />
        <p className="text-xs text-zinc-500">Mínimo de 8 caracteres.</p>
      </div>

      {estado?.erro && (
        <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pendente ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}
