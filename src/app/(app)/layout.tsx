import type { ReactNode } from "react";
import { CascaApp } from "@/app/_componentes/casca-app";

/**
 * Casca ÚNICA de toda a área logada (grupo de rotas `(app)` — não aparece na
 * URL). Por ser compartilhada, trocar de aba (Demandas → Calendário → Ajustes…)
 * mantém a barra do topo e a lateral montadas: só o conteúdo é buscado de
 * novo, e o `loading.tsx` aparece na hora enquanto isso.
 */
export default function LayoutApp({ children }: { children: ReactNode }) {
  return <CascaApp>{children}</CascaApp>;
}
