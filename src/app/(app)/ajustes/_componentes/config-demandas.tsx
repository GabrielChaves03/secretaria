"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { salvarStatusConfig } from "@/app/(app)/ajustes/demandas-config-actions";
import { corTextoSobre } from "@/lib/demandas";
import { STATUS_CONCLUIDO } from "@/lib/demandas";
import type { ConfigDemandas } from "@/lib/demandas-config";

type Linha = { original: string | null; nome: string; cor: string };

export function ConfigDemandas({ config }: { config: ConfigDemandas }) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<Linha[]>(
    config.statuses.map((s) => ({
      original: s,
      nome: s,
      cor: config.statusCores[s] ?? "#C4C4C4",
    })),
  );
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set(i: number, patch: Partial<Linha>) {
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  function mover(i: number, dir: -1 | 1) {
    setLinhas((ls) => {
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const c = [...ls];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  async function salvar() {
    const nomes = linhas.map((l) => l.nome.trim()).filter(Boolean);
    if (nomes.length === 0) {
      setMsg("Tenha pelo menos um status.");
      return;
    }
    const cores: Record<string, string> = {};
    for (const l of linhas) if (l.nome.trim()) cores[l.nome.trim()] = l.cor;

    const finais = new Set(nomes);
    const migracoes: { de: string; para: string }[] = [];
    for (const l of linhas) {
      if (l.original && l.nome.trim() && l.original !== l.nome.trim()) {
        migracoes.push({ de: l.original, para: l.nome.trim() });
      }
    }
    // Status removidos → demandas vão para o primeiro status.
    for (const s of config.statuses) {
      if (!finais.has(s) && !migracoes.some((m) => m.de === s)) {
        migracoes.push({ de: s, para: nomes[0] });
      }
    }

    setSalvando(true);
    setMsg(null);
    const r = await salvarStatusConfig(nomes, cores, migracoes);
    setSalvando(false);
    if (r && "erro" in r) setMsg(r.erro ?? "Erro ao salvar.");
    else {
      setMsg("Status salvos.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-fg-tertiary">
          Renomeie, troque a cor, reordene ou adicione status. As demandas de um
          status renomeado ou removido são movidas automaticamente.
          {" "}
          <span className="text-fg-secondary">
            &quot;{STATUS_CONCLUIDO}&quot; é o status de concluído (usado no
            progresso e no atraso).
          </span>
        </p>

        <div className="mt-3 space-y-2">
          {linhas.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 shrink-0 text-fg-tertiary" />
              <input
                type="color"
                value={l.cor}
                onChange={(e) => set(i, { cor: e.target.value })}
                aria-label="Cor"
                className="h-8 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <input
                value={l.nome}
                onChange={(e) => set(i, { nome: e.target.value })}
                maxLength={30}
                className="campo !py-1.5 flex-1"
              />
              <span
                className="hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline"
                style={{ background: l.cor, color: corTextoSobre(l.cor) }}
              >
                {l.nome || "—"}
              </span>
              <div className="flex shrink-0">
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  className="grid h-7 w-6 place-items-center text-fg-tertiary disabled:opacity-30 hover:text-foreground"
                  aria-label="Subir"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  disabled={i === linhas.length - 1}
                  className="grid h-7 w-6 place-items-center text-fg-tertiary disabled:opacity-30 hover:text-foreground"
                  aria-label="Descer"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary hover:bg-surface-hover hover:text-danger"
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            setLinhas((ls) => [...ls, { original: null, nome: "", cor: "#A25DDC" }])
          }
          className="mt-2 flex items-center gap-1.5 text-sm text-fg-secondary hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Adicionar status
        </button>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="btn btn-primary btn-sm"
          >
            {salvando ? "Salvando…" : "Salvar status"}
          </button>
          {msg && <span className="text-sm text-fg-secondary">{msg}</span>}
        </div>
      </div>

      <p className="border-t border-border pt-5 text-xs text-fg-tertiary">
        As colunas das demandas (criar, renomear, ocultar, reordenar) são
        configuradas em cada quadro, direto no cabeçalho da visão Tabela.
      </p>
    </div>
  );
}

