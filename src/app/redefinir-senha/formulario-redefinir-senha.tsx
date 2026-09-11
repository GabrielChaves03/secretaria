"use client";

import { useActionState } from "react";
import { redefinirSenha, type EstadoFormulario } from "@/app/auth/actions";

export function FormularioRedefinirSenha() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    redefinirSenha,
    undefined,
  );

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="senha" className="rotulo block">
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="campo"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmarSenha" className="rotulo block">
          Confirmar nova senha
        </label>
        <input
          id="confirmarSenha"
          name="confirmarSenha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="campo"
        />
      </div>

      {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="btn btn-primary w-full"
      >
        {pendente ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
