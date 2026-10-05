"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  adicionarColuna,
  adicionarLinha,
  apagarLinha,
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
  const [novaColuna, setNovaColuna] = useState(false);

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

  if (colunas.length === 0) {
    return (
      <div className="mt-6 text-sm text-fg-tertiary">
        Esta planilha ainda não tem colunas.
        {ehChefe && " Adicione a primeira coluna."}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-[var(--radius-lg)] shadow-[inset_0_0_0_1px_var(--border)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover/40 text-left text-xs text-fg-secondary">
              <th className="w-10 px-2 py-2 font-medium text-fg-tertiary">#</th>
              {colunas.map((c) => (
                <th key={c.id} className="min-w-[160px] px-3 py-2 font-medium">
                  {c.nome}
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.id} className="group border-b border-border/60 hover:bg-surface-hover/30">
                <td className="px-2 py-1 text-center text-xs text-fg-tertiary">{i + 1}</td>
                {colunas.map((c) => (
                  <td key={c.id} className="px-1.5 py-1 align-top">
                    <Celula
                      tipo={c.tipo}
                      valor={l.valores?.[c.id] ?? ""}
                      aoMudar={(v) => editarCelula(l.id, c.id, v)}
                      aoSair={() => persistir(l.id)}
                    />
                  </td>
                ))}
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
                <td colSpan={colunas.length + 2} className="px-3 py-3 text-xs text-fg-tertiary">
                  Planilha vazia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            await adicionarLinha(quadroId);
            router.refresh();
          }}
          className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-1.5 text-sm text-fg-secondary shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Nova linha
        </button>
        {ehChefe && (
          <button
            type="button"
            onClick={() => setNovaColuna(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-1.5 text-sm text-fg-secondary shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Nova coluna
          </button>
        )}
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
          className="w-full rounded-[var(--radius-sm)] bg-transparent px-2 py-1 text-xs text-fg-secondary outline-none focus:bg-surface-hover"
        />
        {valor && (
          <a href={valor} target="_blank" rel="noreferrer" className="text-accent">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    );
  }
  return (
    <input
      type={tipo === "numero" ? "text" : "text"}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      onBlur={aoSair}
      className="w-full rounded-[var(--radius-sm)] bg-transparent px-2 py-1 text-xs outline-none focus:bg-surface-hover"
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
      className="mt-3 flex flex-wrap items-end gap-2 rounded-[var(--radius)] bg-surface-hover/40 p-3"
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
