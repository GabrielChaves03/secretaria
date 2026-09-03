import Link from "next/link";
import {
  Check,
  MessageSquare,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { apagarDemanda, definirStatusDemanda } from "@/app/dashboard/actions";
import { BotaoNovaDemanda } from "@/app/dashboard/_componentes/botao-nova-demanda";
import { BlocoComentarios } from "@/app/dashboard/_componentes/bloco-comentarios";
import { obterPerfil } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { listarComentariosPorDemanda } from "@/lib/comentarios-consultas";
import {
  ehStatus,
  PILL_DIFICULDADE,
  PILL_STATUS,
  ROTULO_DIFICULDADE,
  ROTULO_STATUS,
  STATUS,
  type Status,
} from "@/lib/demandas";

export const metadata = { title: "Demandas" };

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const perfil = await obterPerfil();
  const { status: statusBruto } = await searchParams;
  const filtro = ehStatus(statusBruto) ? statusBruto : undefined;
  const ehChefe = perfil.papel === "chefe";

  const demandas = await listarDemandas(filtro);
  const comentariosPorDemanda = await listarComentariosPorDemanda(
    demandas.map((d) => d.id),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8 md:px-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Demandas</h1>
          <p className="mt-0.5 text-sm text-fg-secondary">
            {ehChefe
              ? "Todas as demandas da equipe."
              : "Suas demandas."}
          </p>
        </div>
        <BotaoNovaDemanda />
      </header>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-border pb-2 text-sm">
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

      <ul className="mt-4 space-y-2.5">
        {demandas.length === 0 && (
          <li className="cartao px-5 py-10 text-center text-sm text-fg-tertiary">
            {filtro
              ? `Nenhuma demanda com status "${ROTULO_STATUS[filtro]}".`
              : "Nenhuma demanda cadastrada ainda."}
          </li>
        )}

        {demandas.map((d) => {
          const comentarios = comentariosPorDemanda.get(d.id) ?? [];
          return (
            <li key={d.id} className="cartao px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{d.titulo}</p>
                  {ehChefe && (
                    <p className="mt-0.5 text-xs text-fg-tertiary">
                      {d.dono_nome ?? "—"}
                    </p>
                  )}
                </div>
                <span className={PILL_STATUS[d.status]}>
                  {ROTULO_STATUS[d.status]}
                </span>
              </div>

              {d.descricao && (
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-fg-secondary">
                  {d.descricao}
                </p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-fg-tertiary">
                <span className={PILL_DIFICULDADE[d.dificuldade]}>
                  {ROTULO_DIFICULDADE[d.dificuldade]}
                </span>
                <span>
                  Entrega:{" "}
                  {d.data_entrega
                    ? FMT_DATA.format(new Date(`${d.data_entrega}T00:00:00`))
                    : "sem data"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {d.status !== "em_andamento" && (
                  <BotaoStatus
                    id={d.id}
                    status="em_andamento"
                    rotulo="Iniciar"
                    Icone={Play}
                  />
                )}
                {d.status !== "concluida" && (
                  <BotaoStatus
                    id={d.id}
                    status="concluida"
                    rotulo="Concluir"
                    Icone={Check}
                    destaque
                  />
                )}
                {d.status !== "pendente" && (
                  <BotaoStatus
                    id={d.id}
                    status="pendente"
                    rotulo="Reabrir"
                    Icone={RotateCcw}
                  />
                )}
                <Link
                  href={`/dashboard/${d.id}/editar`}
                  className="btn btn-ghost btn-sm"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Link>
                <form action={apagarDemanda}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" className="btn btn-ghost btn-sm text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                    Apagar
                  </button>
                </form>
              </div>

              <details className="group mt-3 border-t border-border pt-2.5">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-fg-secondary transition-colors hover:text-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comentários
                  <span className="text-fg-tertiary">({comentarios.length})</span>
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
      className={`rounded-[var(--radius-sm)] px-2.5 py-1 transition-colors ${
        ativo
          ? "bg-surface-active font-medium text-foreground"
          : "text-fg-secondary hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {rotulo}
    </Link>
  );
}

function BotaoStatus({
  id,
  status,
  rotulo,
  Icone,
  destaque,
}: {
  id: string;
  status: Status;
  rotulo: string;
  Icone: typeof Play;
  destaque?: boolean;
}) {
  return (
    <form action={definirStatusDemanda}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`btn btn-sm ${destaque ? "btn-secondary" : "btn-ghost"}`}
      >
        <Icone className="h-3.5 w-3.5" />
        {rotulo}
      </button>
    </form>
  );
}
