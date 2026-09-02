import Link from "next/link";
import { MarcarLidas } from "@/app/dashboard/_componentes/marcar-lidas";
import { listarNotificacoes } from "@/lib/notificacoes-consultas";

export const metadata = { title: "Notificações" };

const FMT_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function PaginaNotificacoes() {
  const notificacoes = await listarNotificacoes();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <MarcarLidas />

      <Link href="/dashboard" className="text-sm text-zinc-500 underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Notificações</h1>

      <ul className="mt-6 space-y-2">
        {notificacoes.length === 0 && (
          <li className="text-sm text-zinc-500">Nenhuma notificação.</li>
        )}

        {notificacoes.map((n) => {
          const classe = n.lida
            ? "block rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            : "block rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900";

          const conteudo = (
            <>
              <p className="text-sm">{n.descricao}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {FMT_DATA_HORA.format(new Date(n.criado_em))}
              </p>
            </>
          );

          return (
            <li key={n.id}>
              {n.demanda_id ? (
                <Link
                  href={`/dashboard/${n.demanda_id}/editar`}
                  className={classe}
                >
                  {conteudo}
                </Link>
              ) : (
                <div className={classe}>{conteudo}</div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
