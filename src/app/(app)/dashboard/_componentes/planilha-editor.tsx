"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import {
  adicionarColuna,
  adicionarLinha,
  apagarColuna,
  apagarLinha,
  renomearColuna,
  salvarLinha,
} from "@/app/(app)/dashboard/planilha-actions";
import type { ColunaPlanilha, LinhaPlanilha, TipoColunaPlanilha } from "@/lib/planilha";

export function PlanilhaEditor({
  quadroId,
  colunas,
  linhasIniciais,
  ehChefe,
}: {
  quadroId: string;
  colunas: ColunaPlanilha[];
  linhasIniciais: LinhaPlanilha[];
  ehChefe: boolean;
}) {
  const router = useRouter();
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [cols, setCols] = useState(colunas);
  const [novaColuna, setNovaColuna] = useState(false);

  // Re-sincroniza quando o servidor manda dados novos (add linha/coluna).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLinhas(linhasIniciais);
  }, [linhasIniciais]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCols(colunas);
  }, [colunas]);

  function editarCelula(linhaId: string, colId: string, valor: string) {
    setLinhas((ls) =>
      ls.map((l) =>
        l.id === linhaId ? { ...l, valores: { ...l.valores, [colId]: valor } } : l,
      ),
    );
  }

  async function persistir(linhaId: string) {
    const l = linhas.find((x) => x.id === linhaId);
    if (l) await salvarLinha(linhaId, l.valores);
  }

  if (cols.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-start gap-3 text-sm text-fg-tertiary">
        <p>Esta planilha ainda não tem colunas.</p>
        {ehChefe && (
          <button
            type="button"
            onClick={() => setNovaColuna(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4" /> Adicionar coluna
          </button>
        )}
        {novaColuna && (
          <NovaColunaForm
            quadroId={quadroId}
            aoFechar={() => setNovaColuna(false)}
            aoConcluir={() => {
              setNovaColuna(false);
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-surface shadow-[inset_0_0_0_1px_var(--border)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-raised text-left">
              <th className="w-12 px-3 py-3 text-xs font-medium text-fg-tertiary">#</th>
              {cols.map((c) => (
                <th
                  key={c.id}
                  className="min-w-[180px] border-l border-border/60 px-3 py-2.5"
                >
                  <CabecalhoColuna
                    quadroId={quadroId}
                    coluna={c}
                    ehChefe={ehChefe}
                    aoRemover={() => {
                      setCols((cs) => cs.filter((x) => x.id !== c.id));
                      apagarColuna(quadroId, c.id);
                    }}
                  />
                </th>
              ))}
              {ehChefe && (
                <th className="w-12 border-l border-border/60 px-2 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => setNovaColuna(true)}
                    title="Nova coluna"
                    className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </th>
              )}
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr
                key={l.id}
                className="group border-b border-border/50 transition-colors hover:bg-surface-hover/40"
              >
                <td className="px-3 py-1.5 text-center text-xs text-fg-tertiary">{i + 1}</td>
                {cols.map((c) => (
                  <td key={c.id} className="border-l border-border/40 px-1.5 py-1 align-top">
                    <Celula
                      tipo={c.tipo}
                      valor={l.valores?.[c.id] ?? ""}
                      aoMudar={(v) => editarCelula(l.id, c.id, v)}
                      aoSair={() => persistir(l.id)}
                    />
                  </td>
                ))}
                {ehChefe && <td className="border-l border-border/40" />}
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    aria-label="Apagar linha"
                    onClick={async () => {
                      setLinhas((ls) => ls.filter((x) => x.id !== l.id));
                      await apagarLinha(l.id, quadroId);
                    }}
                    className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary opacity-0 transition-opacity hover:bg-surface-hover hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={cols.length + 3} className="px-3 py-4 text-sm text-fg-tertiary">
                  Planilha vazia.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <button
          type="button"
          onClick={async () => {
            await adicionarLinha(quadroId);
            router.refresh();
          }}
          className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Nova linha
        </button>
      </div>

      <div className="mt-2 text-xs text-fg-tertiary">
        {linhas.length} linha{linhas.length === 1 ? "" : "s"} · {cols.length} colunas
      </div>

      {novaColuna && (
        <NovaColunaForm
          quadroId={quadroId}
          aoFechar={() => setNovaColuna(false)}
          aoConcluir={() => {
            setNovaColuna(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function CabecalhoColuna({
  quadroId,
  coluna,
  ehChefe,
  aoRemover,
}: {
  quadroId: string;
  coluna: ColunaPlanilha;
  ehChefe: boolean;
  aoRemover: () => void;
}) {
  const [nome, setNome] = useState(coluna.nome);

  if (!ehChefe) {
    return (
      <span className="text-sm font-semibold text-foreground">{coluna.nome}</span>
    );
  }

  return (
    <div className="group/col flex items-center gap-1">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => {
          const n = nome.trim();
          if (n && n !== coluna.nome) renomearColuna(quadroId, coluna.id, n);
          else setNome(coluna.nome);
        }}
        className="w-full rounded-[var(--radius-sm)] bg-transparent text-sm font-semibold text-foreground outline-none focus:bg-surface-hover focus:px-1.5 focus:py-0.5"
      />
      <button
        type="button"
        aria-label="Excluir coluna"
        onClick={() => {
          if (confirm(`Excluir a coluna "${coluna.nome}"?`)) aoRemover();
        }}
        className="grid h-5 w-5 shrink-0 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary opacity-0 transition-opacity hover:bg-surface-hover hover:text-danger group-hover/col:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Celula({
  tipo,
  valor,
  aoMudar,
  aoSair,
}: {
  tipo: TipoColunaPlanilha;
  valor: string;
  aoMudar: (v: string) => void;
  aoSair: () => void;
}) {
  if (tipo === "link") {
    return (
      <div className="flex items-center gap-1">
        <input
          type="url"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          onBlur={aoSair}
          placeholder="https://..."
          className="w-full rounded-[var(--radius-sm)] bg-transparent px-2 py-1.5 text-sm text-fg-secondary outline-none focus:bg-surface-hover"
        />
        {valor && (
          <a href={valor} target="_blank" rel="noreferrer" className="shrink-0 text-accent">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    );
  }
  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      onBlur={aoSair}
      className="w-full rounded-[var(--radius-sm)] bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-surface-hover"
    />
  );
}

function NovaColunaForm({
  quadroId,
  aoFechar,
  aoConcluir,
}: {
  quadroId: string;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoColunaPlanilha>("texto");

  return (
    <form
      action={async () => {
        if (!nome.trim()) return;
        await adicionarColuna(quadroId, nome, tipo);
        aoConcluir();
      }}
      className="mt-3 flex flex-wrap items-end gap-2 rounded-[var(--radius)] bg-surface p-3 shadow-[inset_0_0_0_1px_var(--border)]"
    >
      <div className="space-y-1">
        <label className="rotulo block text-xs">Nome da coluna</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
          maxLength={40}
          className="campo !py-1 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="rotulo block text-xs">Tipo</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoColunaPlanilha)}
          className="campo !py-1 text-sm"
        >
          <option value="texto">Texto</option>
          <option value="numero">Número</option>
          <option value="link">Link</option>
          <option value="select">Seleção</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary btn-sm">
        Adicionar
      </button>
      <button type="button" onClick={aoFechar} className="btn btn-ghost btn-sm">
        Cancelar
      </button>
    </form>
  );
}
