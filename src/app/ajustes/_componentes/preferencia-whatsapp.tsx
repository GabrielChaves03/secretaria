"use client";

import { useActionState } from "react";
import { salvarPreferenciaWhatsapp, type EstadoAjuste } from "@/app/ajustes/actions";

export function PreferenciaWhatsapp({
  telefone,
  whatsappAtivo,
}: {
  telefone: string | null;
  whatsappAtivo: boolean;
}) {
  const [estado, acao, pendente] = useActionState<EstadoAjuste, FormData>(
    salvarPreferenciaWhatsapp,
    undefined,
  );

  return (
    <form action={acao} className="mt-3 space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="telefone" className="rotulo block">
          Número (com DDD)
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          defaultValue={telefone ?? ""}
          placeholder="(11) 99999-9999"
          autoComplete="tel"
          className="campo"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="whatsapp_ativo"
          defaultChecked={whatsappAtivo}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Receber avisos de demandas no meu WhatsApp
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendente} className="btn btn-primary btn-sm">
          {pendente ? "Salvando…" : "Salvar"}
        </button>
        {estado && "ok" in estado && (
          <span className="text-sm text-accent-subtle-fg">{estado.ok}</span>
        )}
        {estado && "erro" in estado && (
          <span className="text-sm text-danger">{estado.erro}</span>
        )}
      </div>
    </form>
  );
}
