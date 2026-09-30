import Link from "next/link";
import { PlugZap, ChevronRight } from "lucide-react";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarContas } from "@/lib/manychat-contas-consultas";
import { listarAutomacoes } from "@/lib/manychat-automacoes-consultas";
import { formatarDataHoraBR } from "@/lib/manychat-contas";

export const metadata = { title: "ManyChat" };

export default async function PaginaManyChat({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await requererEscritorio();
  const { erro } = await searchParams;

  const contas = await listarContas();
  const contagens = await Promise.all(
    contas.map((c) => listarAutomacoes(c.id).then((lista) => lista.length)),
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">ManyChat</h1>
        <p className="mt-0.5 text-sm text-fg-secondary">
          Automação de DM do Instagram por palavra-chave — cada conta conectada
          tem suas próprias automações.
        </p>
      </header>

      {erro && (
        <p className="mt-4 rounded-[var(--radius)] bg-danger/10 px-3.5 py-2 text-sm text-danger">
          Erro ao conectar: {erro}
        </p>
      )}

      {contas.length === 0 ? (
        <div className="cartao mt-6 flex flex-col items-center gap-3 px-5 py-14 text-center">
          <p className="text-sm text-fg-secondary">
            Nenhuma conta do Instagram conectada ainda.
          </p>
          <a href="/api/manychat/oauth/login" className="btn btn-primary brilho-hover">
            <PlugZap className="h-4 w-4" />
            Conectar Instagram
          </a>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {contas.map((conta, i) => (
            <Link
              key={conta.id}
              href={`/manychat/contas/${conta.id}`}
              className="cartao brilho-hover flex items-center gap-3 px-4 py-3"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-raised text-xs font-semibold uppercase text-fg-secondary">
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">@{conta.ig_username}</p>
                <p className="truncate text-xs text-fg-tertiary">
                  {contagens[i]} automaç{contagens[i] === 1 ? "ão" : "ões"} · token válido até{" "}
                  {formatarDataHoraBR(conta.token_expires_at)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-tertiary" />
            </Link>
          ))}
        </div>
      )}

      <a
        href="/api/manychat/oauth/login"
        className="btn btn-secondary mt-4 inline-flex brilho-hover"
      >
        <PlugZap className="h-4 w-4" />
        {contas.length === 0 ? "Conectar Instagram" : "Conectar mais uma conta"}
      </a>
    </main>
  );
}
