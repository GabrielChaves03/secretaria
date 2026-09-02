import type { ReactNode } from "react";
import Link from "next/link";
import { sair } from "@/app/auth/actions";
import { contarNaoLidas } from "@/lib/notificacoes-consultas";

export default async function LayoutDashboard({
  children,
}: {
  children: ReactNode;
}) {
  const naoLidas = await contarNaoLidas();

  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 p-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight"
          >
            Gestão de Demandas
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/calendario"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Calendário
            </Link>
            <Link
              href="/dashboard/notificacoes"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Notificações
              {naoLidas > 0 && (
                <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {naoLidas}
                </span>
              )}
            </Link>

            <form action={sair}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}
    </>
  );
}
