import Link from "next/link";
import { Bell, Check, MessageSquare, Pencil, UserPlus } from "lucide-react";
import { MarcarLidas } from "@/app/(app)/dashboard/_componentes/marcar-lidas";
import {
  listarNotificacoes,
  type TipoNotificacao,
} from "@/lib/notificacoes-consultas";

export const metadata = { title: "Notificações" };

const FMT_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const ICONE: Record<TipoNotificacao, typeof Bell> = {
  comentario: MessageSquare,
  status: Check,
  edicao: Pencil,
  atribuicao: UserPlus,
};

export default async function PaginaNotificacoes() {
  const notificacoes = await listarNotificacoes();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8 md:px-10">
      <MarcarLidas />

      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-fg-secondary" />
        <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
      </div>

      <ul className="mt-6 space-y-1.5">
        {notificacoes.length === 0 && (
          <li className="cartao px-5 py-10 text-center text-sm text-fg-tertiary">
            Nenhuma notificação.
          </li>
        )}

        {notificacoes.map((n) => {
          const Icone = ICONE[n.tipo] ?? Bell;
          const classe = `flex items-start gap-3 rounded-[var(--radius)] px-3.5 py-3 transition-colors ${
            n.lida
              ? "text-fg-secondary hover:bg-surface-hover"
              : "bg-accent-subtle-bg text-foreground hover:brightness-95"
          }`;

          const conteudo = (
            <>
              <Icone className="mt-0.5 h-4 w-4 shrink-0 text-fg-tertiary" />
              <div className="min-w-0">
                <p className="text-sm">{n.descricao}</p>
                <p className="mt-0.5 text-xs text-fg-tertiary">
                  {FMT_DATA_HORA.format(new Date(n.criado_em))}
                </p>
              </div>
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
