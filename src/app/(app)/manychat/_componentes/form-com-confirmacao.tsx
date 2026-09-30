"use client";

import type { ReactNode } from "react";

/**
 * `<form>` que pede confirmação (`window.confirm`) antes de disparar a
 * Server Action — usado em ações destrutivas (excluir automação).
 */
export function FormComConfirmacao({
  acao,
  mensagem,
  children,
  className,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  mensagem: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={acao}
      className={className}
      onSubmit={(e) => {
        if (!confirm(mensagem)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
