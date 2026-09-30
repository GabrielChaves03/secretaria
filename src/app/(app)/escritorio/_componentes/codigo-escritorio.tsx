"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw } from "lucide-react";
import { regenerarCodigo } from "@/app/(app)/escritorio/actions";

export function CodigoEscritorio({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // navegador sem clipboard: ignora, o código está visível na tela
    }
  }

  function gerarNovo() {
    if (
      !window.confirm(
        "Gerar um código novo? O código atual para de funcionar para quem ainda não entrou.",
      )
    ) {
      return;
    }
    iniciar(async () => {
      await regenerarCodigo();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded-[var(--radius-sm)] bg-raised px-3 py-2 font-mono text-lg font-semibold tracking-[0.3em] text-foreground">
        {codigo}
      </code>

      <button
        type="button"
        onClick={copiar}
        className="btn btn-secondary btn-sm"
      >
        {copiado ? (
          <Check className="h-3.5 w-3.5 text-accent" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copiado ? "Copiado" : "Copiar"}
      </button>

      <button
        type="button"
        onClick={gerarNovo}
        disabled={pendente}
        className="btn btn-ghost btn-sm"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pendente ? "animate-spin" : ""}`} />
        Gerar novo
      </button>
    </div>
  );
}
