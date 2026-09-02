import Link from "next/link";
import { apagarDemanda, definirStatusDemanda } from "@/app/dashboard/actions";
import { BlocoComentarios } from "@/app/dashboard/_componentes/bloco-comentarios";
import { obterPerfil } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { listarComentariosPorDemanda } from "@/lib/comentarios-consultas";
import {
  ehStatus,
  ROTULO_DIFICULDADE,
  ROTULO_STATUS,
  STATUS,
} from "@/lib/demandas";

export const metadata = { title: "Painel" };

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const perfil = await obterPerfil();
  const { status: statusBruto } = await searchParams;
  const filtro = ehStatus(statusBruto) ? statusBruto : undefined;

  const demandas = await listarDemandas(filtro);
  const comentariosPorDemanda = await listarComentariosPorDemanda(
    demandas.map((d) => d.id),
  );

  const ehChefe = perfil.papel === "chefe";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {ehChefe ? "Todas as demandas" : "Minhas demandas"}
          </h1>
          <p className="text-sm text-zinc-500">
            {perfil.nome ?? perfil.email}
            {ehChefe && " · chefe"}
          </p>
        </div>
        <Link
          href="/dashboard/nova"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Nova demanda
        </Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1 text-sm">
        <FiltroLink rotulo="Todas" href="/dashboard" ativo={!filtro} />
        {STATUS.map((s) => (
          <FiltroLink
            key={s}
            rotulo={ROTULO_STATUS[s]}
            href={`/dashboard?status=${s}`}
            ativo={filtro === s}
          />
        ))}
      </nav>

      <ul className="mt-4 space-y-3">
        {demandas.length === 0 && (
          <li className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            {filtro
              ? `Nenhuma demanda com status "${ROTULO_STATUS[filtro]}".`
              : "Nenhuma demanda cadastrada ainda."}
          </li>
        )}

        {demandas.map((d) => {
          const comentarios = comentariosPorDemanda.get(d.id) ?? [];
          return (
            <li
              key={d.id}
              className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{d.titulo}</p>
                  {ehChefe && (
                    <p className="text-xs text-zinc-500">
                      de {d.dono_nome ?? "—"}
                    </p>
                  )}
                  {d.descricao && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                      {d.descricao}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700">
                  {ROTULO_STATUS[d.status]}
                </span>
              </div>

              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
                <div>
                  <dt className="inline">Dificuldade: </dt>
                  <dd className="inline">{ROTULO_DIFICULDADE[d.dificuldade]}</dd>
                </div>
                <div>
                  <dt className="inline">Entrega: </dt>
                  <dd className="inline">
                    {d.data_entrega
                      ? FMT_DATA.format(new Date(`${d.data_entrega}T00:00:00`))
                      : "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                {d.status !== "em_andamento" && (
                  <BotaoStatus
                    id={d.id}
                    status="em_andamento"
                    rotulo="Em andamento"
                  />
                )}
                {d.status !== "concluida" && (
                  <BotaoStatus id={d.id} status="concluida" rotulo="Concluir" />
                )}
                {d.status !== "pendente" && (
                  <BotaoStatus id={d.id} status="pendente" rotulo="Reabrir" />
                )}
                <Link
                  href={`/dashboard/${d.id}/editar`}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Editar
                </Link>
                <form action={apagarDemanda}>
                  <input type="hidden" name="id" value={d.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Apagar
                  </button>
                </form>
              </div>

              <details className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/60">
                <summary className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-400">
                  Comentários ({comentarios.length})
                </summary>
                <div className="mt-3">
                  <BlocoComentarios
                    demandaId={d.id}
                    comentarios={comentarios}
                    usuarioId={perfil.id}
                  />
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function FiltroLink({
  rotulo,
  href,
  ativo,
}: {
  rotulo: string;
  href: string;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        ativo
          ? "rounded-md bg-zinc-900 px-2.5 py-1 text-white dark:bg-white dark:text-zinc-900"
          : "rounded-md border border-zinc-300 px-2.5 py-1 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      }
    >
      {rotulo}
    </Link>
  );
}

function BotaoStatus({
  id,
  status,
  rotulo,
}: {
  id: string;
  status: string;
  rotulo: string;
}) {
  return (
    <form action={definirStatusDemanda}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {rotulo}
      </button>
    </form>
  );
}
