"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OperacoesNav } from "@/app/(app)/_componentes/operacoes-nav";
import type { OperacaoComQuadros } from "@/lib/operacoes";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ListTodo,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

type ItemNav = {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
  ativo: (caminho: string) => boolean;
};

/** Quadro pessoal (e as telas de criar/editar demanda, que partem dele). */
const ehQuadroPessoal = (c: string) =>
  c === "/dashboard" ||
  c.startsWith("/dashboard/nova") ||
  /^\/dashboard\/[^/]+\/editar/.test(c);

const ehQuadroEquipe = (c: string) => c.startsWith("/dashboard/equipe");

const DEMANDAS: ItemNav = {
  href: "/dashboard",
  rotulo: "Demandas",
  Icone: ListTodo,
  ativo: ehQuadroPessoal,
};

/** Só para o chefe: "Demandas" vira um grupo com as duas visões. */
const SUBITENS_CHEFE: ItemNav[] = [
  { href: "/dashboard", rotulo: "Demandas Pessoais", Icone: User, ativo: ehQuadroPessoal },
  {
    href: "/dashboard/equipe",
    rotulo: "Demandas Funcionários",
    Icone: Users,
    ativo: ehQuadroEquipe,
  },
];

const OUTROS: ItemNav[] = [
  {
    href: "/calendario",
    rotulo: "Calendário",
    Icone: CalendarDays,
    ativo: (c) => c.startsWith("/calendario"),
  },
  {
    href: "/metricas",
    rotulo: "Métricas",
    Icone: BarChart3,
    ativo: (c) => c.startsWith("/metricas"),
  },
];

export function BarraLateral({
  ehChefe,
  operacoes,
}: {
  ehChefe: boolean;
  operacoes: OperacaoComQuadros[];
}) {
  const caminho = usePathname();
  const [demandasAberto, setDemandasAberto] = useState(true);

  // Faixa do mobile: sem grupo — as duas visões do chefe viram itens soltos.
  const itensMobile = ehChefe
    ? [
        { ...SUBITENS_CHEFE[0], rotulo: "Pessoais" },
        { ...SUBITENS_CHEFE[1], rotulo: "Funcionários" },
        ...OUTROS,
      ]
    : [DEMANDAS, ...OUTROS];

  return (
    <>
      {/* --- Desktop: coluna à esquerda, abaixo da barra do topo --- */}
      <aside className="hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex md:sticky md:top-12 md:h-[calc(100vh-3rem)] md:w-56 md:self-start md:overflow-y-auto">
        <nav className="flex flex-col gap-0.5 px-2 py-3">
          {ehChefe ? (
            <>
              <button
                type="button"
                onClick={() => setDemandasAberto((a) => !a)}
                aria-expanded={demandasAberto}
                className="brilho-hover flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-sm text-fg-secondary hover:bg-surface-hover hover:text-foreground"
              >
                <ListTodo className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Demandas</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    demandasAberto ? "" : "-rotate-90"
                  }`}
                />
              </button>
              {demandasAberto && (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
                  {SUBITENS_CHEFE.map((it) => (
                    <ItemLink key={it.href} item={it} ativo={it.ativo(caminho)} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <ItemLink item={DEMANDAS} ativo={DEMANDAS.ativo(caminho)} />
          )}
          {OUTROS.map((it) => (
            <ItemLink key={it.href} item={it} ativo={it.ativo(caminho)} />
          ))}
        </nav>
        <div className="border-t border-border px-2 py-2">
          <OperacoesNav operacoes={operacoes} ehChefe={ehChefe} />
        </div>
      </aside>

      {/* --- Mobile: faixa de navegação logo abaixo da barra do topo --- */}
      <nav className="sticky top-12 z-40 flex items-center gap-1 overflow-x-auto border-b border-border bg-sidebar px-2 py-1.5 md:hidden">
        {itensMobile.map((it) => {
          const ativo = it.ativo(caminho);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`brilho-hover flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm ${
                ativo
                  ? "bg-surface-active font-medium text-foreground"
                  : "text-fg-secondary hover:bg-surface-hover"
              }`}
            >
              <it.Icone className="h-4 w-4" />
              {it.rotulo}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function ItemLink({ item, ativo }: { item: ItemNav; ativo: boolean }) {
  const { href, rotulo, Icone } = item;
  return (
    <Link
      href={href}
      className={`brilho-hover flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-sm ${
        ativo
          ? "bg-surface-active font-medium text-foreground"
          : "text-fg-secondary hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <Icone className="h-4 w-4 shrink-0" />
      <span className="flex-1">{rotulo}</span>
    </Link>
  );
}
