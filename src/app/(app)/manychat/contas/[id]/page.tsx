import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RefreshCw, Play, Pause, Layers, Plus } from "lucide-react";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { obterConta } from "@/lib/manychat-contas-consultas";
import { listarAutomacoes } from "@/lib/manychat-automacoes-consultas";
import { formatarDataHoraBR } from "@/lib/manychat-contas";
import { ListaAutomacoes } from "./_componentes/lista-automacoes";

export const metadata = { title: "Conta Instagram" };

export default async function PaginaConta({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    conectado?: string;
    criada?: string;
    atualizada?: string;
    excluida?: string;
    erro?: string;
  }>;
}) {
  await requererEscritorio();
  const { id } = await params;
  const { conectado, criada, atualizada, excluida, erro } = await searchParams;

  const conta = await obterConta(id);
  if (!conta) notFound();

  const automacoes = await listarAutomacoes(id);
  const ativas = automacoes.filter((a) => a.active).length;
  const pausadas = automacoes.length - ativas;

  const aviso =
    (conectado && "Instagram conectado com sucesso!") ||
    (criada && "Automação criada") ||
    (atualizada && "Automação atualizada") ||
    (excluida && "Automação excluída") ||
    null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
      <Link
        href="/manychat"
        className="inline-flex items-center gap-1 text-sm text-fg-tertiary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Todas as contas
      </Link>

      {aviso && (
        <p className="mt-4 rounded-[var(--radius)] bg-accent-subtle-bg px-3.5 py-2 text-sm text-accent-subtle-fg">
          {aviso}
        </p>
      )}
      {erro && (
        <p className="mt-4 rounded-[var(--radius)] bg-danger/10 px-3.5 py-2 text-sm text-danger">
          Erro: {erro}
        </p>
      )}

      <section className="cartao mt-4 px-4 py-4">
        <h2 className="mb-3 text-sm font-semibold">Conexão com o Instagram</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-raised text-xs font-semibold uppercase text-fg-secondary">
              {conta.ig_profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={conta.ig_profile_picture_url}
                  alt={`Foto de @${conta.ig_username}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                (conta.ig_username?.slice(0, 2) ?? "IG")
              )}
            </div>
            <div>
              <p className="text-sm font-medium">@{conta.ig_username}</p>
              <p className="text-sm text-fg-tertiary">
                Token válido até {formatarDataHoraBR(conta.token_expires_at)}
              </p>
            </div>
          </div>
          <a href="/api/manychat/oauth/login" className="btn btn-secondary">
            <RefreshCw className="h-3.5 w-3.5" />
            Reconectar
          </a>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi icone={Play} rotulo="Ativas" valor={ativas} />
        <Kpi icone={Pause} rotulo="Pausadas" valor={pausadas} />
        <Kpi icone={Layers} rotulo="Total" valor={automacoes.length} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Automações</h2>
        <Link href={`/manychat/contas/${id}/automations/novo`} className="btn btn-primary btn-sm brilho-hover">
          <Plus className="h-3.5 w-3.5" />
          Nova automação
        </Link>
      </div>

      <div className="mt-3">
        <ListaAutomacoes contaId={id} automacoes={automacoes} />
      </div>
    </main>
  );
}

function Kpi({ icone: Icone, rotulo, valor }: { icone: typeof Play; rotulo: string; valor: number }) {
  return (
    <div className="cartao flex items-center gap-3 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-subtle-bg text-accent-subtle-fg">
        <Icone className="h-4 w-4" />
      </span>
      <div>
        <p className="font-mono text-2xl font-semibold leading-none tabular-nums">{valor}</p>
        <p className="text-xs text-fg-tertiary">{rotulo}</p>
      </div>
    </div>
  );
}
