"use client";

import { useActionState } from "react";
import {
  solicitarRecuperacaoSenha,
  type EstadoFormulario,
} from "@/app/auth/actions";

export function FormularioEsqueciSenha() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    solicitarRecuperacaoSenha,
    undefined,
  );

  return (
    <form action={acao} className="space-y-4">
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

      {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="btn btn-primary w-full"
      >
        {pendente ? "Enviando..." : "Enviar link de redefinição"}
      </button>
    </form>
  );
}
