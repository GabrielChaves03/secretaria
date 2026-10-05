"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Modal } from "@/app/(app)/dashboard/_componentes/modal";
import { FormularioDemanda } from "@/app/(app)/dashboard/_componentes/formulario-demanda";
import { atualizarDemanda, criarDemanda, moverDemanda } from "@/app/(app)/dashboard/actions";
import {
  adicionarGrupo,
  apagarGrupo,
  corGrupo,
  renomearGrupo,
} from "@/app/(app)/dashboard/quadro-grupos-actions";
import {
  corTextoSobre,
  ehConcluido,
  estaAtrasada,
  PILL_PRIORIDADE,
  type DemandaComDono,
} from "@/lib/demandas";
import {
  corDoStatus,
  type ColunaDemanda,
  type ConfigDemandas,
} from "@/lib/demandas-config";
import { CORES_OPERACAO } from "@/lib/operacoes";
import type { Membro } from "@/lib/escritorios";

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

type Props = {
  quadroId: string;
  demandas: DemandaComDono[];
  config: ConfigDemandas;
  grupos: { ordem: string[]; cores: Record<string, string>; primeiro: string };
  membros?: Pick<Membro, "id" | "nome" | "papel">[];
  usuarioId: string;
  ehChefe: boolean;
  hoje: string;
};

export function BoardTabela({
  quadroId,
  demandas,
  config,
  grupos,
  membros,
  usuarioId,
  ehChefe,
  hoje,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<
    | { tipo: "novo"; grupo: string }
    | { tipo: "editar"; demanda: DemandaComDono }
    | { tipo: "novo-grupo" }
    | null
  >(null);

  const colunasAtivas = config.colunas.filter(
    (c) => c.ativo && c.id !== "status" && c.id !== "responsavel",
  );
  const responsavelPadrao = membros?.find((m) => m.papel === "funcionario")?.id;

  // Ordem dos grupos: primeiro + os ordenados + os que só aparecem nas tarefas.
  const ordemGrupos = useMemo(() => {
    const vistos = new Set<string>();
    const lista: string[] = [];
    const add = (g: string) => {
      if (g && !vistos.has(g)) {
        vistos.add(g);
        lista.push(g);
      }
    };
    add(grupos.primeiro);
    grupos.ordem.forEach(add);
    for (const d of demandas) add(d.grupo || grupos.primeiro);
    return lista;
  }, [grupos, demandas]);

  const porGrupo = useMemo(() => {
    const m: Record<string, DemandaComDono[]> = {};
    for (const g of ordemGrupos) m[g] = [];
    for (const d of demandas) (m[d.grupo || grupos.primeiro] ??= []).push(d);
    return m;
  }, [ordemGrupos, demandas, grupos.primeiro]);

  return (
    <div className="mt-4 flex flex-col gap-5">
      {ordemGrupos.map((g) => (
        <GrupoTabela
          key={g}
          quadroId={quadroId}
          grupo={g}
          cor={grupos.cores[g] ?? "#579BFC"}
          ehPrimeiro={g === grupos.primeiro}
          tarefas={porGrupo[g] ?? []}
          colunasAtivas={colunasAtivas}
          config={config}
          ehChefe={ehChefe}
          hoje={hoje}
          aoNovaTarefa={() => setModal({ tipo: "novo", grupo: g })}
          aoEditar={(d) => setModal({ tipo: "editar", demanda: d })}
        />
      ))}

      {ehChefe && (
        <button
          type="button"
          onClick={() => setModal({ tipo: "novo-grupo" })}
          className="flex w-fit items-center gap-2 rounded-[var(--radius)] px-3 py-1.5 text-sm text-fg-secondary shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Novo grupo
        </button>
      )}

      {modal?.tipo === "novo" && (
        <Modal titulo={`Nova demanda — ${modal.grupo}`} aoFechar={() => setModal(null)}>
          <FormularioDemanda
            acao={criarDemanda}
            rotuloEnvio="Criar demanda"
            membros={membros}
            usuarioId={usuarioId}
            responsavelPadrao={responsavelPadrao}
            quadroId={quadroId}
            grupo={modal.grupo}
            statuses={config.statuses}
            aoConcluir={() => {
              setModal(null);
              router.refresh();
            }}
          />
        </Modal>
      )}

      {modal?.tipo === "editar" && (
        <Modal titulo="Editar demanda" aoFechar={() => setModal(null)}>
          <FormularioDemanda
            acao={atualizarDemanda}
            demanda={modal.demanda}
            rotuloEnvio="Salvar"
            membros={membros}
            usuarioId={usuarioId}
            statuses={config.statuses}
            aoConcluir={() => {
              setModal(null);
              router.refresh();
            }}
          />
        </Modal>
      )}

      {modal?.tipo === "novo-grupo" && (
        <ModalNovoGrupo
          quadroId={quadroId}
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

function GrupoTabela({
  quadroId,
  grupo,
  cor,
  ehPrimeiro,
  tarefas,
  colunasAtivas,
  config,
  ehChefe,
  hoje,
  aoNovaTarefa,
  aoEditar,
}: {
  quadroId: string;
  grupo: string;
  cor: string;
  ehPrimeiro: boolean;
  tarefas: DemandaComDono[];
  colunasAtivas: ColunaDemanda[];
  config: ConfigDemandas;
  ehChefe: boolean;
  hoje: string;
  aoNovaTarefa: () => void;
  aoEditar: (d: DemandaComDono) => void;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);

  const total = tarefas.length;
  const concluidas = tarefas.filter((d) => ehConcluido(d.status)).length;
  const pct = total ? Math.round((concluidas / total) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[inset_0_0_0_1px_var(--border)]">
      {/* Cabeçalho do grupo */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: `${cor}22`, boxShadow: `inset 3px 0 0 ${cor}` }}
      >
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="grid h-5 w-5 place-items-center text-fg-tertiary"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${aberto ? "" : "-rotate-90"}`}
          />
        </button>
        <span className="text-sm font-semibold" style={{ color: cor }}>
          {grupo}
        </span>
        <span className="rounded-full bg-surface-hover px-1.5 text-xs font-medium text-fg-tertiary">
          {total}
        </span>
        {ehChefe && (
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary hover:bg-surface-hover hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuAberto && (
              <MenuGrupo
                quadroId={quadroId}
                grupo={grupo}
                corAtual={cor}
                ehPrimeiro={ehPrimeiro}
                aoFechar={() => setMenuAberto(false)}
                aoMudar={() => {
                  setMenuAberto(false);
                  router.refresh();
                }}
              />
            )}
          </div>
        )}
      </div>

      {aberto && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-tertiary">
                <th className="px-3 py-2 font-medium">Tarefa</th>
                <th className="px-3 py-2 font-medium">Responsável</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {colunasAtivas.map((c) => (
                  <th key={c.id} className="px-3 py-2 font-medium">
                    {c.nome}
                  </th>
                ))}
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {tarefas.map((d) => (
                <LinhaTarefa
                  key={d.id}
                  demanda={d}
                  colunasAtivas={colunasAtivas}
                  config={config}
                  hoje={hoje}
                  aoEditar={() => aoEditar(d)}
                />
              ))}
              {tarefas.length === 0 && (
                <tr>
                  <td
                    colSpan={colunasAtivas.length + 4}
                    className="px-3 py-3 text-xs text-fg-tertiary"
                  >
                    Nada neste grupo ainda.
                  </td>
                </tr>
              )}
              {/* Linha de resumo */}
              {tarefas.length > 0 && (
                <tr className="border-t border-border bg-surface-hover/40 text-xs text-fg-tertiary">
                  <td className="px-3 py-2 font-medium">
                    {concluidas}/{total} concluídas
                  </td>
                  <td className="px-3 py-2" colSpan={colunasAtivas.length + 3}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 max-w-[200px] flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: "var(--accent)" }}
                        />
                      </div>
                      <span className="font-medium">{pct}%</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <button
            type="button"
            onClick={aoNovaTarefa}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-xs text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova demanda
          </button>
        </div>
      )}
    </section>
  );
}

function LinhaTarefa({
  demanda: d,
  colunasAtivas,
  config,
  hoje,
  aoEditar,
}: {
  demanda: DemandaComDono;
  colunasAtivas: ColunaDemanda[];
  config: ConfigDemandas;
  hoje: string;
  aoEditar: () => void;
}) {
  const atrasada = estaAtrasada(d, hoje);
  return (
    <tr className="group border-b border-border/60 hover:bg-surface-hover/40">
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={aoEditar}
          className="text-left font-medium text-foreground hover:text-accent"
        >
          {d.titulo}
        </button>
      </td>
      <td className="px-3 py-2">
        {d.dono_nome ? (
          <span className="text-fg-secondary">{d.dono_nome}</span>
        ) : (
          <span className="text-fg-tertiary">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <StatusPill demandaId={d.id} status={d.status} config={config} />
      </td>
      {colunasAtivas.map((c) => (
        <td key={c.id} className="px-3 py-2 text-fg-secondary">
          {c.id === "prazo" ? (
            <span className={atrasada ? "font-medium text-danger" : ""}>
              {d.data_entrega
                ? FMT_DATA.format(new Date(`${d.data_entrega}T00:00:00`))
                : "—"}
            </span>
          ) : c.id === "prioridade" ? (
            d.prioridade ? (
              <span className={PILL_PRIORIDADE[d.prioridade] ?? "pill pill-gray"}>
                {d.prioridade}
              </span>
            ) : (
              "—"
            )
          ) : c.id === "notas" ? (
            <span className="line-clamp-1 max-w-[260px]">{d.descricao || "—"}</span>
          ) : c.id === "link" ? (
            d.link ? (
              <a
                href={d.link}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                abrir
              </a>
            ) : (
              "—"
            )
          ) : (
            <span>{d.campos?.[c.id] || "—"}</span>
          )}
        </td>
      ))}
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={aoEditar}
          aria-label="Editar"
          className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary opacity-0 transition-opacity hover:bg-surface-hover hover:text-foreground group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function StatusPill({
  demandaId,
  status,
  config,
}: {
  demandaId: string;
  status: string;
  config: ConfigDemandas;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const cor = corDoStatus(config, status);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ background: cor, color: corTextoSobre(cor) }}
      >
        {status}
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div
            className="absolute left-0 top-full z-50 mt-1 w-44 rounded-[var(--radius)] bg-overlay p-1"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            {config.statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={async () => {
                  setAberto(false);
                  await moverDemanda(demandaId, `status:${s}`);
                  router.refresh();
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm text-fg-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: corDoStatus(config, s) }}
                />
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MenuGrupo({
  quadroId,
  grupo,
  corAtual,
  ehPrimeiro,
  aoFechar,
  aoMudar,
}: {
  quadroId: string;
  grupo: string;
  corAtual: string;
  ehPrimeiro: boolean;
  aoFechar: () => void;
  aoMudar: () => void;
}) {
  const [renomeando, setRenomeando] = useState(false);
  const [nome, setNome] = useState(grupo);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={aoFechar} />
      <div
        className="absolute right-0 top-full z-50 mt-1 w-52 rounded-[var(--radius)] bg-overlay p-2"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        {renomeando ? (
          <form
            action={async () => {
              await renomearGrupo(quadroId, grupo, nome);
              aoMudar();
            }}
            className="flex items-center gap-1"
          >
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              maxLength={40}
              className="campo !py-1 text-sm"
            />
            <button type="submit" className="btn btn-primary btn-sm">
              OK
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setRenomeando(true)}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm text-fg-secondary hover:bg-surface-hover hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" /> Renomear grupo
          </button>
        )}

        <div className="px-2 py-1.5">
          <span className="text-xs text-fg-tertiary">Cor</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {CORES_OPERACAO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={async () => {
                  await corGrupo(quadroId, grupo, c);
                  aoMudar();
                }}
                aria-label={`Cor ${c}`}
                className={`h-5 w-5 rounded-full ${corAtual === c ? "ring-2 ring-offset-1 ring-offset-overlay" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {!ehPrimeiro && (
          <form
            action={async () => {
              await apagarGrupo(quadroId, grupo);
              aoMudar();
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm text-danger hover:bg-surface-hover"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir grupo
            </button>
          </form>
        )}
      </div>
    </>
  );
}

function ModalNovoGrupo({
  quadroId,
  aoFechar,
  aoConcluir,
}: {
  quadroId: string;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_OPERACAO[1]);

  return (
    <Modal titulo="Novo grupo" aoFechar={aoFechar}>
      <form
        action={async () => {
          if (!nome.trim()) return;
          await adicionarGrupo(quadroId, nome, cor);
          aoConcluir();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="grupo-nome" className="rotulo block">
            Nome do grupo
          </label>
          <input
            id="grupo-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            required
            maxLength={40}
            placeholder="Ex: Em produção"
            className="campo"
          />
        </div>
        <div className="space-y-1.5">
          <span className="rotulo block">Cor</span>
          <div className="flex flex-wrap gap-1.5">
            {CORES_OPERACAO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                aria-label={`Cor ${c}`}
                className={`h-7 w-7 rounded-full ${cor === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            Criar grupo
          </button>
          <button type="button" onClick={aoFechar} className="btn btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
