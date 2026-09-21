"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clapperboard, ListTodo, PlugZap, type LucideIcon } from "lucide-react";

type ItemNav = {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
  ativo: (caminho: string) => boolean;
};

const ITENS: ItemNav[] = [
  {
    href: "/dashboard",
    rotulo: "Demandas",
    Icone: ListTodo,
    ativo: (c) =>
      c === "/dashboard" ||
      c.startsWith("/dashboard/nova") ||
      /^\/dashboard\/[^/]+\/editar/.test(c),
  },
  {
    href: "/calendario",
    rotulo: "Calendário",
    Icone: CalendarDays,
    ativo: (c) => c.startsWith("/calendario"),
  },
  {
    href: "/manychat",
    rotulo: "ManyChat",
    Icone: PlugZap,
    ativo: (c) => c.startsWith("/manychat"),
  },
  {
    href: "/editor-de-videos",
    rotulo: "Editor de Vídeos",
    Icone: Clapperboard,
    ativo: (c) => c.startsWith("/editor-de-videos"),
  },
];

export function BarraLateral() {
  const caminho = usePathname();

  return (
    <>
      {/* --- Desktop: coluna à esquerda, abaixo da barra do topo --- */}
      <aside className="hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex md:sticky md:top-12 md:h-[calc(100vh-3rem)] md:w-56 md:self-start md:overflow-y-auto">
        <nav className="flex flex-col gap-0.5 px-2 py-3">
          {ITENS.map((it) => (
            <ItemLink key={it.href} item={it} ativo={it.ativo(caminho)} />
          ))}
        </nav>
      </aside>

      {/* --- Mobile: faixa de navegação logo abaixo da barra do topo --- */}
      <nav className="sticky top-12 z-40 flex items-center gap-1 border-b border-border bg-sidebar px-2 py-1.5 md:hidden">
        {ITENS.map((it) => {
          const ativo = it.ativo(caminho);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`brilho-hover flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm ${
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
