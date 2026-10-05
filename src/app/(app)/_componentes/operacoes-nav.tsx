"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Pencil,
  Plus,
  StickyNote,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/app/(app)/dashboard/_componentes/modal";
import {
  CORES_OPERACAO,
  type OperacaoComQuadros,
  type QuadroComTotal,
  type QuadroNode,
} from "@/lib/operacoes";
import {
  apagarOperacao,
  apagarQuadro,
  criarOperacao,
  criarQuadro,
  editarOperacao,
  editarQuadro,
} from "@/app/(app)/dashboard/operacoes-actions";
import { criarTabela } from "@/app/(app)/dashboard/planilha-actions";

const LS_ABERTAS = "secretaria_operacoes_abertas";

type FormaModal =
  | { tipo: "nova-operacao" }
  | { tipo: "editar-operacao"; id: string; nome: string; cor: string }
  | { tipo: "novo-quadro"; operacaoId: string }
  | { tipo: "editar-quadro"; id: string; nome: string; cor: string };

/** Rota de um quadro conforme o tipo. */
function linkDe(q: { id: string; tipo: string }) {
  return q.tipo === "planilha"
    ? `/dashboard/planilha/${q.id}`
    : `/dashboard/quadro/${q.id}`;
}

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
  const [quadrosAbertos, setQuadrosAbertos] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<FormaModal | null>(null);

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
      const prox = { ...a, [id]: !(a[id] ?? true) };
      try {
        localStorage.setItem(LS_ABERTAS, JSON.stringify(prox));
      } catch {
        /* ignora */
      }
      return prox;
    });
  }

  const ativo =
    caminho.startsWith("/dashboard/quadro/") ||
    caminho.startsWith("/dashboard/planilha/")
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
            title="Nova pasta"
            className="grid h-5 w-5 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        {operacoes.length === 0 && (
          <p className="px-2 py-1 text-xs text-fg-tertiary">
            {ehChefe ? "Crie a primeira pasta." : "Nenhuma pasta."}
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
                      title="Editar pasta"
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
                      confirmar={`Excluir a pasta "${op.nome}" e todos os quadros e demandas dentro dela?`}
                      title="Excluir pasta"
                      onDone={() => router.refresh()}
                    >
                      <Trash2 className="h-3 w-3" />
                    </FormBotao>
                  </span>
                )}
              </div>

              {aberta && (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
                  {op.quadros.map((q) => (
                    <QuadroItem
                      key={q.id}
                      quadro={q}
                      ativo={ativo}
                      ehChefe={ehChefe}
                      aberto={quadrosAbertos[q.id] ?? true}
                      onToggle={() =>
                        setQuadrosAbertos((s) => ({ ...s, [q.id]: !(s[q.id] ?? true) }))
                      }
                      onEditar={(x) => setModal({ tipo: "editar-quadro", ...x })}
                      router={router}
                    />
                  ))}
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

function QuadroItem({
  quadro: q,
  ativo,
  ehChefe,
  aberto,
  onToggle,
  onEditar,
  router,
}: {
  quadro: QuadroNode;
  ativo: string | null;
  ehChefe: boolean;
  aberto: boolean;
  onToggle: () => void;
  onEditar: (x: { id: string; nome: string; cor: string }) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const temFilhos = q.filhos.length > 0;
  return (
    <div>
      <LinhaQuadro
        quadro={q}
        ativo={ativo}
        ehChefe={ehChefe}
        temFilhos={temFilhos}
        aberto={aberto}
        onToggle={onToggle}
        onEditar={onEditar}
        router={router}
      />
      {temFilhos && aberto && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
          {q.filhos.map((f) => (
            <LinhaQuadro
              key={f.id}
              quadro={f}
              ativo={ativo}
              ehChefe={ehChefe}
              temFilhos={false}
              aberto={false}
              onToggle={() => {}}
              onEditar={onEditar}
              router={router}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaQuadro({
  quadro: q,
  ativo,
  ehChefe,
  temFilhos,
  aberto,
  onToggle,
  onEditar,
  router,
}: {
  quadro: QuadroComTotal;
  ativo: string | null;
  ehChefe: boolean;
  temFilhos: boolean;
  aberto: boolean;
  onToggle: () => void;
  onEditar: (x: { id: string; nome: string; cor: string }) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const estaAtivo = q.id === ativo;
  return (
    <div
      className={`group/q flex items-center gap-1.5 rounded-[var(--radius)] px-2 py-1.5 ${
        estaAtivo ? "bg-surface-active" : "hover:bg-surface-hover"
      }`}
    >
      {temFilhos ? (
        <button
          type="button"
          onClick={onToggle}
          className="grid h-4 w-4 shrink-0 place-items-center text-fg-tertiary"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${aberto ? "rotate-90" : ""}`}
          />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <Link href={linkDe(q)} className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: q.cor }} />
        <span
          className={`flex min-w-0 items-center gap-1 truncate text-sm ${
            estaAtivo ? "font-medium text-foreground" : "text-fg-secondary"
          }`}
        >
          {q.tipo === "planilha" && <Table2 className="h-3 w-3 shrink-0 opacity-60" />}
          {q.tipo === "anotacoes" && <StickyNote className="h-3 w-3 shrink-0 opacity-60" />}
          {q.nome}
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-surface-hover px-1.5 text-[0.65rem] font-medium text-fg-tertiary">
          {q.total}
        </span>
      </Link>
      {ehChefe && (
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/q:opacity-100">
          <BotaoIcone
            title="Editar"
            onClick={() => onEditar({ id: q.id, nome: q.nome, cor: q.cor })}
          >
            <Pencil className="h-3 w-3" />
          </BotaoIcone>
          <FormBotao
            action={apagarQuadro}
            id={q.id}
            confirmar={`Excluir "${q.nome}" e tudo dentro dele?`}
            title="Excluir"
            onDone={() => {
              if (estaAtivo) router.push("/dashboard");
              else router.refresh();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </FormBotao>
        </span>
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

type DefColuna = { nome: string; tipo: string };

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
  const [tipoQuadro, setTipoQuadro] = useState<"tarefas" | "tabela">("tarefas");
  const [colunas, setColunas] = useState<DefColuna[]>([{ nome: "", tipo: "texto" }]);
  const [linhas, setLinhas] = useState(3);

  const ehTabelaNova = forma.tipo === "novo-quadro" && tipoQuadro === "tabela";

  const titulo = {
    "nova-operacao": "Nova pasta",
    "editar-operacao": "Editar pasta",
    "novo-quadro": "Novo quadro",
    "editar-quadro": "Editar quadro",
  }[forma.tipo];

  const action =
    forma.tipo === "nova-operacao"
      ? criarOperacao
      : forma.tipo === "editar-operacao"
        ? editarOperacao
        : forma.tipo === "novo-quadro"
          ? tipoQuadro === "tabela"
            ? criarTabela
            : criarQuadro
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
        {ehTabelaNova && (
          <>
            <input
              type="hidden"
              name="colunas"
              value={JSON.stringify(colunas.filter((c) => c.nome.trim()))}
            />
            <input type="hidden" name="linhas" value={linhas} />
          </>
        )}

        <div className="space-y-1.5">
          <label htmlFor="nome" className="rotulo block">
            Nome {ehOperacao ? "da pasta" : "do quadro"}
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
            <select
              id="tipo"
              value={tipoQuadro}
              onChange={(e) => setTipoQuadro(e.target.value as "tarefas" | "tabela")}
              className="campo"
            >
              <option value="tarefas">📋 Quadro de tarefas (demandas)</option>
              <option value="tabela">📊 Tabela personalizável</option>
            </select>
            <p className="text-xs text-fg-tertiary">
              {tipoQuadro === "tarefas"
                ? "Demandas desta operação — também aparecem na aba Demandas."
                : "Uma tabela livre: você define as colunas, os tipos e as linhas."}
            </p>
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
                  cor === c ? "scale-110" : ""
                }`}
                style={{ background: c, boxShadow: cor === c ? `0 0 0 2px ${c}` : "none" }}
              />
            ))}
          </div>
        </div>

        {ehTabelaNova && (
          <div className="space-y-2 rounded-[var(--radius)] bg-surface-hover/40 p-3">
            <span className="rotulo block">Colunas</span>
            {colunas.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={c.nome}
                  onChange={(e) =>
                    setColunas((cs) =>
                      cs.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)),
                    )
                  }
                  placeholder={`Coluna ${i + 1}`}
                  maxLength={40}
                  className="campo !py-1 flex-1 text-sm"
                />
                <select
                  value={c.tipo}
                  onChange={(e) =>
                    setColunas((cs) =>
                      cs.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)),
                    )
                  }
                  className="campo !py-1 w-28 text-sm"
                >
                  <option value="texto">Texto</option>
                  <option value="numero">Número</option>
                  <option value="link">Link</option>
                  <option value="select">Seleção</option>
                </select>
                {colunas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setColunas((cs) => cs.filter((_, j) => j !== i))}
                    aria-label="Remover coluna"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary hover:bg-surface-hover hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setColunas((cs) => [...cs, { nome: "", tipo: "texto" }])}
              className="flex items-center gap-1.5 text-xs text-fg-secondary hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar coluna
            </button>

            <div className="flex items-center gap-2 pt-1">
              <label htmlFor="linhas" className="text-sm text-fg-secondary">
                Linhas iniciais
              </label>
              <input
                id="linhas"
                type="number"
                min={0}
                max={100}
                value={linhas}
                onChange={(e) => setLinhas(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="campo !py-1 w-20 text-sm"
              />
            </div>
          </div>
        )}

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
