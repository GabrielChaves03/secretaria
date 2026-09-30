import { notFound } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, UserMinus } from "lucide-react";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { obterEscritorio, listarMembros } from "@/lib/escritorios-consultas";
import { ROTULO_PAPEL } from "@/lib/demandas";
import { CodigoEscritorio } from "./_componentes/codigo-escritorio";
import { SairEscritorio } from "./_componentes/sair-escritorio";
import { definirPapelMembro, removerMembro } from "./actions";

export const metadata = { title: "Escritório" };

export default async function PaginaEscritorio() {
  const perfil = await requererEscritorio();
  const ehChefe = perfil.papel === "chefe";

  const escritorio = await obterEscritorio();
  if (!escritorio) notFound();

  const membros = await listarMembros();

  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-6 py-8 md:px-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          {escritorio.nome}
        </h1>
        <p className="mt-0.5 text-sm text-fg-secondary">
          {ehChefe
            ? "Você é chefe deste escritório."
            : "Você é funcionário deste escritório."}
        </p>

        {ehChefe && (
          <section className="mt-6">
            <h2 className="rotulo">Código de convite</h2>
            <p className="mt-1 text-sm text-fg-secondary">
              Quem tem esse código entra no escritório como funcionário.
            </p>
            <div className="mt-3">
              <CodigoEscritorio codigo={escritorio.codigo} />
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="rotulo">
            Membros <span className="text-fg-tertiary">({membros.length})</span>
          </h2>

          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border">
            {membros.map((m) => {
              const souEu = m.id === perfil.id;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-surface px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.nome ?? m.telefone ?? "—"}
                      {souEu && (
                        <span className="ml-1.5 text-xs text-fg-tertiary">
                          (você)
                        </span>
                      )}
                    </p>
                    {m.nome && m.telefone && (
                      <p className="truncate text-xs text-fg-tertiary">
                        {m.telefone}
                      </p>
                    )}
                  </div>

                  <span
                    className={
                      m.papel === "chefe" ? "pill pill-green" : "pill pill-gray"
                    }
                  >
                    {ROTULO_PAPEL[m.papel]}
                  </span>

                  {ehChefe && !souEu && (
                    <div className="flex items-center gap-1">
                      {m.papel === "funcionario" ? (
                        <FormAcaoMembro
                          usuario={m.id}
                          papel="chefe"
                          titulo="Promover a chefe"
                          Icone={ArrowUpCircle}
                          acao={definirPapelMembro}
                        />
                      ) : (
                        <FormAcaoMembro
                          usuario={m.id}
                          papel="funcionario"
                          titulo="Rebaixar a funcionário"
                          Icone={ArrowDownCircle}
                          acao={definirPapelMembro}
                        />
                      )}
                      <FormAcaoMembro
                        usuario={m.id}
                        titulo="Remover do escritório"
                        Icone={UserMinus}
                        acao={removerMembro}
                        perigo
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8 border-t border-border pt-6">
          <SairEscritorio ehChefe={ehChefe} totalMembros={membros.length} />
        </section>
      </main>
    </>
  );
}

function FormAcaoMembro({
  usuario,
  papel,
  titulo,
  Icone,
  acao,
  perigo,
}: {
  usuario: string;
  papel?: string;
  titulo: string;
  Icone: typeof UserMinus;
  acao: (formData: FormData) => void;
  perigo?: boolean;
}) {
  return (
    <form action={acao}>
      <input type="hidden" name="usuario" value={usuario} />
      {papel && <input type="hidden" name="papel" value={papel} />}
      <button
        type="submit"
        title={titulo}
        aria-label={titulo}
        className={`grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] transition-colors hover:bg-surface-hover ${
          perigo
            ? "text-fg-tertiary hover:text-danger"
            : "text-fg-tertiary hover:text-foreground"
        }`}
      >
        <Icone className="h-4 w-4" />
      </button>
    </form>
  );
}
