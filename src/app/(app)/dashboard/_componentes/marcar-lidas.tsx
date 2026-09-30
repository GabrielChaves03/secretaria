"use client";

import { useEffect } from "react";
import { marcarNotificacoesLidas } from "@/app/(app)/dashboard/actions";

/**
 * Marca todas as notificações como lidas assim que a página abre.
 * Não renderiza nada.
 */
export function MarcarLidas() {
  useEffect(() => {
    void marcarNotificacoesLidas();
  }, []);

  return null;
}
