"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ListTodo,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { sair } from "@/app/auth/actions";

type ItemNav = {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
  ativo: (caminho: string) => boolean;
  contador?: number;
};

export function BarraLateral({
  nome,
  ehChefe,
  naoLidas,
}: {
  nome: string;
  ehChefe: boolean;
  naoLidas: number;
}) {
  const caminho = usePathname();

  const itens: ItemNav[] = [
    {
      href: "/dashboard",
      rotulo: "Demandas",
      Icone: ListTodo,
      ativo: (c) => c === "/dashboard" || c.startsWith("/dashboard/nova") || /^\/dashboard\/[^/]+\/editar/.test(c),
    },
    {
      href: "/calendario",
      rotulo: "Calendário",
      Icone: CalendarDays,
      ativo: (c) => c.startsWith("/calendario"),
    },
    {
      href: "/dashboard/notificacoes",
      rotulo: "Notificações",
      Icone: Bell,
      ativo: (c) => c.startsWith("/dashboard/notificacoes"),
      contador: naoLidas,
    },
  ];

  const iniciais =
    nome
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <>
      {/* --- Desktop: coluna à esquerda --- */}
      <aside className="hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex md:w-60">
        <div className="flex items-center gap-2 px-3 py-3">
          <span className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] bg-accent text-[11px] font-semibold text-accent-foreground">
            S
          </span>
          <span className="text-sm font-semibold">Secretária</span>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-1">
          {itens.map((it) => (
            <ItemLink key={it.href} item={it} ativo={it.ativo(caminho)} />
          ))}
        </nav>

        <div className="mt-auto border-t border-border p-2">
          <div className="flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-active text-[10px] font-semibold text-fg-secondary">
              {iniciais}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{nome}</p>
              <p className="text-[11px] text-fg-tertiary">
                {ehChefe ? "Chefe" : "Funcionário"}
              </p>
            </div>
            <form action={sair}>
              <button
                type="submit"
                title="Sair"
                className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* --- Mobile: barra no topo --- */}
      <header className="flex items-center gap-1 border-b border-border bg-sidebar px-2 py-1.5 md:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 py-1 text-sm font-semibold"
        >
          <span className="grid h-5 w-5 place-items-center rounded-[var(--radius-sm)] bg-accent text-[10px] font-semibold text-accent-foreground">
            S
          </span>
          Secretária
        </Link>
        <div className="ml-auto flex items-center gap-0.5">
          {itens.map((it) => {
            const ativo = it.ativo(caminho);
            return (
              <Link
                key={it.href}
                href={it.href}
                title={it.rotulo}
                className={`relative grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] transition-colors ${
                  ativo
                    ? "bg-surface-active text-foreground"
                    : "text-fg-secondary hover:bg-surface-hover"
                }`}
              >
                <it.Icone className="h-4 w-4" />
                {it.contador ? (
                  <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-danger px-0.5 text-[9px] font-semibold text-white">
                    {it.contador}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <form action={sair}>
            <button
              type="submit"
              title="Sair"
              className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-fg-secondary transition-colors hover:bg-surface-hover"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>
    </>
  );
}

function ItemLink({ item, ativo }: { item: ItemNav; ativo: boolean }) {
  const { href, rotulo, Icone, contador } = item;
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-sm transition-colors ${
        ativo
          ? "bg-surface-active font-medium text-foreground"
          : "text-fg-secondary hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <Icone className="h-4 w-4 shrink-0" />
      <span className="flex-1">{rotulo}</span>
      {contador ? (
        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
          {contador}
        </span>
      ) : null}
    </Link>
  );
}
