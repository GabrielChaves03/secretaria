"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { sairEscritorio } from "@/app/escritorio/actions";

export function SairEscritorio({
  ehChefe,
  totalMembros,
}: {
  ehChefe: boolean;
  totalMembros: number;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function sair() {
    const aviso =
      ehChefe && totalMembros <= 1
        ? "Sair vai APAGAR este escritório e todas as demandas dele (você é o único membro). Continuar?"
        : "Tem certeza que quer sair deste escritório?";
    if (!window.confirm(aviso)) return;

    setErro(null);
    iniciar(async () => {
      const r = await sairEscritorio();
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={sair}
        disabled={pendente}
        className="btn btn-danger btn-sm"
      >
        <LogOut className="h-3.5 w-3.5" />
        {pendente ? "Saindo…" : "Sair do escritório"}
      </button>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}
