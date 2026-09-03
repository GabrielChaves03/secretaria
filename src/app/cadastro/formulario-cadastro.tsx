"use client";

import { useActionState } from "react";
import { cadastrar, type EstadoFormulario } from "@/app/auth/actions";

export function FormularioCadastro() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    cadastrar,
    undefined,
  );

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="nome" className="rotulo block">
          Nome
        </label>
        <input id="nome" name="nome" type="text" required className="campo" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="telefone" className="rotulo block">
          Telefone
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          autoComplete="tel"
          className="campo"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="rotulo block">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="campo"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="senha" className="rotulo block">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="campo"
        />
        <p className="text-xs text-fg-tertiary">Mínimo de 8 caracteres.</p>
      </div>

      {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="btn btn-primary w-full"
      >
        {pendente ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}
