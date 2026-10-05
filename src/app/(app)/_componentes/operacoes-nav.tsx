"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { Modal } from "@/app/(app)/dashboard/_componentes/modal";
import { CORES_OPERACAO, type OperacaoComQuadros } from "@/lib/operacoes";
import {
  apagarOperacao,
  apagarQuadro,
  criarOperacao,
  criarQuadro,
  editarOperacao,
  editarQuadro,
} from "@/app/(app)/dashboard/operacoes-actions";

const LS_ABERTAS = "secretaria_operacoes_abertas";

type FormaModal =
  | { tipo: "nova-operacao" }
  | { tipo: "editar-operacao"; id: string; nome: string; cor: string }
  | { tipo: "novo-quadro"; operacaoId: string }
  | { tipo: "editar-quadro"; id: string; nome: string; cor: string };

export function OperacoesNav({
  operacoes,
  ehChefe,
}: {
  operacoes: OperacaoComQuadros[];
  ehChefe: boolean;
}) {
  const caminho = usePathname();
  const router = useRouter();
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<FormaModal | null>(null);

  // Estado de expandido/recolhido por operação (lembrado no navegador).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_ABERTAS);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setAbertas(JSON.parse(raw));
    } catch {
      /* ignora */
    }
  }, []);

  function alternar(id: string) {
    setAbertas((a) => {
      const prox = { ...a, [id]: !a[id] };
      try {
        localStorage.setItem(LS_ABERTAS, JSON.stringify(prox));
      } catch {
        /* ignora */
      }
      return prox;
    });
  }

  const quadroAtivo = caminho.startsWith("/dashboard/quadro/")
    ? caminho.split("/")[3]
    : null;

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-fg-tertiary">
          Operações
        </span>
        {ehChefe && (
          <button
            type="button"
            onClick={() => setModal({ tipo: "nova-operacao" })}
            title="Nova operação"
            className="grid h-5 w-5 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        {operacoes.length === 0 && (
          <p className="px-2 py-1 text-xs text-fg-tertiary">
            {ehChefe ? "Crie a primeira operação." : "Nenhuma operação."}
          </p>
        )}

        {operacoes.map((op) => {
          const aberta = abertas[op.id] ?? true;
          return (
            <div key={op.id}>
              <div className="group/op flex items-center gap-1.5 rounded-[var(--radius)] px-2 py-1.5 hover:bg-surface-hover">
                <button
                  type="button"
                  onClick={() => alternar(op.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 text-fg-tertiary transition-transform ${
                      aberta ? "rotate-90" : ""
                    }`}
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ background: op.cor }}
                  />
                  <span className="truncate text-sm font-medium text-foreground">
                    {op.nome}
                  </span>
                </button>
                {ehChefe && (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/op:opacity-100">
                    <BotaoIcone
                      title="Editar operação"
                      onClick={() =>
                        setModal({
                          tipo: "editar-operacao",
                          id: op.id,
                          nome: op.nome,
                          cor: op.cor,
                        })
                      }
                    >
                      <Pencil className="h-3 w-3" />
                    </BotaoIcone>
                    <FormBotao
                      action={apagarOperacao}
                      id={op.id}
                      confirmar={`Excluir a operação "${op.nome}" e todos os quadros e demandas dentro dela?`}
                      title="Excluir operação"
                      onDone={() => router.refresh()}
                    >
                      <Trash2 className="h-3 w-3" />
                    </FormBotao>
                  </span>
                )}
              </div>

              {aberta && (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
                  {op.quadros.map((q) => {
                    const ativo = q.id === quadroAtivo;
                    return (
                      <div
                        key={q.id}
                        className={`group/q flex items-center gap-1.5 rounded-[var(--radius)] px-2 py-1.5 ${
                          ativo
                            ? "bg-surface-active"
                            : "hover:bg-surface-hover"
                        }`}
                      >
                        <Link
                          href={`/dashboard/quadro/${q.id}`}
                          className="flex min-w-0 flex-1 items-center gap-1.5"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: q.cor }}
                          />
                          <span
                            className={`flex min-w-0 items-center gap-1 truncate text-sm ${
                              ativo ? "font-medium text-foreground" : "text-fg-secondary"
                            }`}
                          >
                            {q.tipo === "anotacoes" && (
                              <StickyNote className="h-3 w-3 shrink-0 opacity-60" />
                            )}
                            {q.nome}
                          </span>
                          <span className="ml-auto shrink-0 rounded-full bg-surface-hover px-1.5 text-[0.65rem] font-medium text-fg-tertiary">
                            {q.total}
                          </span>
                        </Link>
                        {ehChefe && (
                          <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/q:opacity-100">
                            <BotaoIcone
                              title="Editar quadro"
                              onClick={() =>
                                setModal({
                                  tipo: "editar-quadro",
                                  id: q.id,
                                  nome: q.nome,
                                  cor: q.cor,
                                })
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </BotaoIcone>
                            <FormBotao
                              action={apagarQuadro}
                              id={q.id}
                              confirmar={`Excluir o quadro "${q.nome}" e todas as demandas dentro dele?`}
                              title="Excluir quadro"
                              onDone={() => {
                                if (ativo) router.push("/dashboard");
                                else router.refresh();
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </FormBotao>
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {ehChefe && (
                    <button
                      type="button"
                      onClick={() => setModal({ tipo: "novo-quadro", operacaoId: op.id })}
                      className="flex items-center gap-1.5 rounded-[var(--radius)] px-2 py-1.5 text-xs text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" /> Novo quadro
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <ModalForma
          forma={modal}
          aoFechar={() => setModal(null)}
          aoConcluir={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function BotaoIcone({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-5 w-5 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}

/** Botão que dispara uma server action (apagar) com confirmação. */
function FormBotao({
  action,
  id,
  confirmar,
  title,
  onDone,
  children,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  confirmar: string;
  title: string;
  onDone: () => void;
  children: React.ReactNode;
}) {
  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone();
      }}
      onSubmit={(e) => {
        if (!confirm(confirmar)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title={title}
        className="grid h-5 w-5 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-danger"
      >
        {children}
      </button>
    </form>
  );
}

function ModalForma({
  forma,
  aoFechar,
  aoConcluir,
}: {
  forma: FormaModal;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const ehOperacao =
    forma.tipo === "nova-operacao" || forma.tipo === "editar-operacao";
  const edicao =
    forma.tipo === "editar-operacao" || forma.tipo === "editar-quadro";
  const corInicial = edicao ? forma.cor : CORES_OPERACAO[0];
  const [cor, setCor] = useState(corInicial);

  const titulo = {
    "nova-operacao": "Nova operação",
    "editar-operacao": "Editar operação",
    "novo-quadro": "Novo quadro",
    "editar-quadro": "Editar quadro",
  }[forma.tipo];

  const action =
    forma.tipo === "nova-operacao"
      ? criarOperacao
      : forma.tipo === "editar-operacao"
        ? editarOperacao
        : forma.tipo === "novo-quadro"
          ? criarQuadro
          : editarQuadro;

  return (
    <Modal titulo={titulo} aoFechar={aoFechar}>
      <form
        action={async (fd) => {
          await action(fd);
          aoConcluir();
        }}
        className="space-y-4"
      >
        {forma.tipo === "editar-operacao" || forma.tipo === "editar-quadro" ? (
          <input type="hidden" name="id" value={forma.id} />
        ) : null}
        {forma.tipo === "novo-quadro" && (
          <input type="hidden" name="operacao_id" value={forma.operacaoId} />
        )}

        <div className="space-y-1.5">
          <label htmlFor="nome" className="rotulo block">
            Nome {ehOperacao ? "da operação" : "do quadro"}
          </label>
          <input
            id="nome"
            name="nome"
            autoFocus
            required
            maxLength={60}
            defaultValue={edicao ? forma.nome : ""}
            placeholder={ehOperacao ? "Ex: IGM" : "Ex: Gomapet"}
            className="campo"
          />
        </div>

        {forma.tipo === "novo-quadro" && (
          <div className="space-y-1.5">
            <label htmlFor="tipo" className="rotulo block">
              Tipo
            </label>
            <select id="tipo" name="tipo" defaultValue="tarefas" className="campo">
              <option value="tarefas">📋 Quadro de tarefas</option>
              <option value="anotacoes">📝 Quadro de anotações</option>
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <span className="rotulo block">Cor</span>
          <input type="hidden" name="cor" value={cor} />
          <div className="flex flex-wrap gap-1.5">
            {CORES_OPERACAO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                aria-label={`Cor ${c}`}
                className={`h-7 w-7 rounded-full transition-transform ${
                  cor === c ? "scale-110 ring-2 ring-offset-2 ring-offset-surface" : ""
                }`}
                style={{ background: c, boxShadow: cor === c ? `0 0 0 2px ${c}` : "none" }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn btn-primary">
            {edicao ? "Salvar" : "Criar"}
          </button>
          <button type="button" onClick={aoFechar} className="btn btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
