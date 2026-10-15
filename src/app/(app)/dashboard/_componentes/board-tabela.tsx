"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Modal } from "@/app/(app)/dashboard/_componentes/modal";
import { Popover } from "@/app/(app)/dashboard/_componentes/popover";
import { corAuto } from "@/app/(app)/dashboard/_componentes/planilha-editor";
import {
  FormularioDemanda,
  tipoInput,
} from "@/app/(app)/dashboard/_componentes/formulario-demanda";
import {
  atualizarDemanda,
  criarDemanda,
  moverDemanda,
  salvarCampoDemanda,
} from "@/app/(app)/dashboard/actions";
import {
  adicionarGrupo,
  apagarGrupo,
  corGrupo,
  renomearGrupo,
} from "@/app/(app)/dashboard/quadro-grupos-actions";
import { salvarColunasQuadro } from "@/app/(app)/dashboard/quadro-colunas-actions";
import {
  corTextoSobre,
  ehConcluido,
  estaAtrasada,
  PILL_PRIORIDADE,
  type DemandaComDono,
} from "@/lib/demandas";
import {
  corDoStatus,
  TIPOS_PERSONALIZADOS,
  type ColunaDemanda,
  type ConfigDemandas,
  type TipoColuna,
} from "@/lib/demandas-config";
import { CORES_OPERACAO } from "@/lib/operacoes";
import type { Membro } from "@/lib/escritorios";

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

/** Colunas que o quadro não pode esconder (o board depende delas). */
const FIXAS = new Set(["responsavel", "status"]);

type Props = {
  quadroId: string;
  demandas: DemandaComDono[];
  /** Config do escritório com `colunas` já trocadas pelas DESTE quadro. */
  config: ConfigDemandas;
  grupos: { ordem: string[]; cores: Record<string, string>; primeiro: string };
  membros?: Pick<Membro, "id" | "nome" | "papel">[];
  usuarioId: string;
  ehChefe: boolean;
  hoje: string;
};

/** Operações sobre as colunas do quadro (qualquer membro pode). */
type EditorColunas = {
  alterar: (id: string, patch: Partial<ColunaDemanda>) => void;
  mover: (id: string, dir: -1 | 1) => void;
  excluir: (id: string) => void;
  adicionar: (nome: string, tipo: TipoColuna) => void;
  ocultas: ColunaDemanda[];
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

  // Colunas DESTE quadro — edição otimista, salva no servidor a cada mudança.
  const [cols, setCols] = useState(config.colunas);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCols(config.colunas);
  }, [config.colunas]);

  const salvarCols = useCallback(
    async (prox: ColunaDemanda[]) => {
      setCols(prox);
      const r = await salvarColunasQuadro(quadroId, prox);
      if (r && "erro" in r) alert(r.erro);
      router.refresh();
    },
    [quadroId, router],
  );

  const visiveis = cols.filter((c) => c.ativo);
  const ocultas = cols.filter((c) => !c.ativo);
  const extrasForm = visiveis.filter((c) => !c.sistema);

  const editor: EditorColunas = {
    alterar: (id, patch) => salvarCols(cols.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    mover: (id, dir) => {
      // Move entre as VISÍVEIS (pula as ocultas no meio do caminho).
      const vis = cols.filter((c) => c.ativo);
      const i = vis.findIndex((c) => c.id === id);
      const alvo = vis[i + dir];
      if (i < 0 || !alvo) return;
      const prox = [...cols];
      const a = prox.findIndex((c) => c.id === id);
      const b = prox.findIndex((c) => c.id === alvo.id);
      [prox[a], prox[b]] = [prox[b], prox[a]];
      salvarCols(prox);
    },
    excluir: (id) => salvarCols(cols.filter((c) => c.id !== id)),
    adicionar: (nome, tipo) =>
      salvarCols([
        ...cols,
        {
          id: `c_${crypto.randomUUID().slice(0, 8)}`,
          nome: nome.trim().slice(0, 40),
          tipo,
          ativo: true,
          sistema: false,
          ...(tipo === "selecao" ? { opcoes: [] } : {}),
        },
      ]),
    ocultas,
  };

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
          colunas={visiveis}
          editor={editor}
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
            colunasExtras={extrasForm}
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
            colunasExtras={extrasForm}
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
  colunas,
  editor,
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
  colunas: ColunaDemanda[];
  editor: EditorColunas;
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
        <div className="rolagem-tabela overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-tertiary">
                <th className="px-3 py-2 font-medium">Tarefa</th>
                {colunas.map((c, i) => (
                  <th key={c.id} className="px-2 py-1.5 font-medium">
                    <CabecalhoColuna
                      coluna={c}
                      editor={editor}
                      primeira={i === 0}
                      ultima={i === colunas.length - 1}
                    />
                  </th>
                ))}
                <th className="w-10 px-2 py-1.5">
                  <BotaoNovaColuna editor={editor} />
                </th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map((d) => (
                <LinhaTarefa
                  key={d.id}
                  demanda={d}
                  colunas={colunas}
                  editor={editor}
                  config={config}
                  hoje={hoje}
                  aoEditar={() => aoEditar(d)}
                />
              ))}
              {tarefas.length === 0 && (
                <tr>
                  <td colSpan={colunas.length + 2} className="px-3 py-3 text-xs text-fg-tertiary">
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
                  <td className="px-3 py-2" colSpan={colunas.length + 1}>
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
  colunas,
  editor,
  config,
  hoje,
  aoEditar,
}: {
  demanda: DemandaComDono;
  colunas: ColunaDemanda[];
  editor: EditorColunas;
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
      {colunas.map((c) => (
        <td key={c.id} className="px-3 py-2 text-fg-secondary">
          {c.id === "responsavel" ? (
            d.dono_nome ? (
              <span className="text-fg-secondary">{d.dono_nome}</span>
            ) : (
              <span className="text-fg-tertiary">—</span>
            )
          ) : c.id === "status" ? (
            <StatusPill demandaId={d.id} status={d.status} config={config} />
          ) : c.id === "prazo" ? (
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
            <CelulaCampo
              demandaId={d.id}
              coluna={c}
              editor={editor}
              valor={d.campos?.[c.id] ?? ""}
            />
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
  const ancora = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => setAberto(false), []);
  const cor = corDoStatus(config, status);

  return (
    <>
      <button
        ref={ancora}
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ background: cor, color: corTextoSobre(cor) }}
      >
        {status}
      </button>
      {aberto && (
        <Popover ancora={ancora} aoFechar={fechar} largura={176}>
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
        </Popover>
      )}
    </>
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

/** Cabeçalho de uma coluna: clique abre o menu (renomear/tipo/opções/mover/ocultar/excluir). */
function CabecalhoColuna({
  coluna: c,
  editor,
  primeira,
  ultima,
}: {
  coluna: ColunaDemanda;
  editor: EditorColunas;
  primeira: boolean;
  ultima: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => setAberto(false), []);
  const [nome, setNome] = useState(c.nome);
  const [opcoes, setOpcoes] = useState((c.opcoes ?? []).join(", "));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNome(c.nome);
    setOpcoes((c.opcoes ?? []).join(", "));
  }, [c.nome, c.opcoes]);

  function salvarNome() {
    const n = nome.trim();
    if (n && n !== c.nome) editor.alterar(c.id, { nome: n });
    else setNome(c.nome);
  }
  function salvarOpcoes() {
    const lista = [...new Set(opcoes.split(",").map((o) => o.trim()).filter(Boolean))];
    if (lista.join("|") !== (c.opcoes ?? []).join("|")) editor.alterar(c.id, { opcoes: lista });
  }

  const tipoRotulo = c.sistema
    ? null
    : TIPOS_PERSONALIZADOS.find((t) => t.tipo === c.tipo)?.rotulo;

  return (
    <>
      <button
        ref={ancora}
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Editar coluna"
        className="group/col flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-sm)] px-1 py-0.5 text-left font-medium text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        {c.nome}
        <ChevronDown className="h-3 w-3 opacity-0 transition-opacity group-hover/col:opacity-100" />
      </button>

      {aberto && (
        <Popover ancora={ancora} aoFechar={fechar} largura={240}>
          <div className="space-y-2 p-1">
            <div className="space-y-1">
              <label className="rotulo block text-[10px]">Nome</label>
              <input
                value={nome}
                autoFocus
                maxLength={40}
                onChange={(e) => setNome(e.target.value)}
                onBlur={salvarNome}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="campo !py-1 text-sm"
              />
            </div>

            {!c.sistema && (
              <div className="space-y-1">
                <label className="rotulo block text-[10px]">Tipo</label>
                <select
                  value={c.tipo}
                  onChange={(e) => {
                    const tipo = e.target.value as TipoColuna;
                    editor.alterar(c.id, {
                      tipo,
                      ...(tipo === "selecao" && !c.opcoes ? { opcoes: [] } : {}),
                    });
                  }}
                  className="campo !py-1 text-sm"
                >
                  {TIPOS_PERSONALIZADOS.map((t) => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!c.sistema && c.tipo === "selecao" && (
              <div className="space-y-1">
                <label className="rotulo block text-[10px]">Opções (separadas por vírgula)</label>
                <textarea
                  value={opcoes}
                  rows={2}
                  onChange={(e) => setOpcoes(e.target.value)}
                  onBlur={salvarOpcoes}
                  placeholder="Instagram, TikTok, Site"
                  className="campo !py-1 resize-y text-sm"
                />
              </div>
            )}

            <div className="flex items-center gap-1 border-t border-border pt-2">
              <button
                type="button"
                disabled={primeira}
                onClick={() => editor.mover(c.id, -1)}
                title="Mover para a esquerda"
                className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={ultima}
                onClick={() => editor.mover(c.id, 1)}
                title="Mover para a direita"
                className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {tipoRotulo && (
                <span className="ml-1 text-[10px] text-fg-tertiary">{tipoRotulo}</span>
              )}
              <div className="ml-auto flex gap-1">
                {!FIXAS.has(c.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false);
                      editor.alterar(c.id, { ativo: false });
                    }}
                    title="Ocultar coluna (volta pelo +)"
                    className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary hover:bg-surface-hover hover:text-foreground"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                )}
                {!c.sistema && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Excluir a coluna "${c.nome}" deste quadro?`)) return;
                      setAberto(false);
                      editor.excluir(c.id);
                    }}
                    title="Excluir coluna"
                    className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary hover:bg-surface-hover hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}

/** "+" no fim do cabeçalho: cria coluna nova e reexibe as ocultas. */
function BotaoNovaColuna({ editor }: { editor: EditorColunas }) {
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => setAberto(false), []);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoColuna>("texto");

  return (
    <>
      <button
        ref={ancora}
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Nova coluna"
        className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
      </button>

      {aberto && (
        <Popover ancora={ancora} aoFechar={fechar} largura={240}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nome.trim()) return;
              editor.adicionar(nome, tipo);
              setNome("");
              setTipo("texto");
              setAberto(false);
            }}
            className="space-y-2 p-1"
          >
            <p className="text-xs font-medium text-foreground">Nova coluna</p>
            <input
              value={nome}
              autoFocus
              maxLength={40}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome (ex.: Cliente)"
              className="campo !py-1 text-sm"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoColuna)}
              className="campo !py-1 text-sm"
            >
              {TIPOS_PERSONALIZADOS.map((t) => (
                <option key={t.tipo} value={t.tipo}>
                  {t.rotulo}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary btn-sm w-full">
              Adicionar coluna
            </button>
          </form>

          {editor.ocultas.length > 0 && (
            <div className="mt-1.5 border-t border-border p-1 pt-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-fg-tertiary">
                Colunas ocultas
              </p>
              {editor.ocultas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => editor.alterar(c.id, { ativo: true })}
                  className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1 text-left text-sm text-fg-secondary hover:bg-surface-hover hover:text-foreground"
                >
                  {c.nome}
                  <span className="text-[10px] text-accent">mostrar</span>
                </button>
              ))}
            </div>
          )}
        </Popover>
      )}
    </>
  );
}

const FMT_NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Valor de uma coluna personalizada formatado para exibir na célula. */
function exibirCampo(tipo: ColunaDemanda["tipo"], valor: string) {
  if (tipo === "data" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return FMT_DATA.format(new Date(`${valor}T00:00:00`));
  }
  if (tipo === "numero" && valor !== "" && !Number.isNaN(Number(valor))) {
    return FMT_NUMERO.format(Number(valor));
  }
  return valor;
}

/** Célula de coluna personalizada: clica, edita, sai (blur/Enter) e salva. */
function CelulaCampo({
  demandaId,
  coluna,
  editor,
  valor: valorInicial,
}: {
  demandaId: string;
  coluna: ColunaDemanda;
  editor: EditorColunas;
  valor: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(valorInicial);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValor(valorInicial);
  }, [valorInicial]);

  async function salvar(novo: string) {
    setEditando(false);
    if (novo.trim() === valorInicial) return;
    setValor(novo.trim());
    const r = await salvarCampoDemanda(demandaId, coluna.id, novo);
    if (r && "erro" in r) {
      alert(r.erro);
      setValor(valorInicial);
    }
    router.refresh();
  }

  if (coluna.tipo === "selecao") {
    return (
      <CelulaSelecao
        valor={valor}
        coluna={coluna}
        editor={editor}
        aoEscolher={(v) => salvar(v)}
      />
    );
  }

  if (editando) {
    return (
      <input
        autoFocus
        type={tipoInput(coluna.tipo)}
        step={coluna.tipo === "numero" ? "any" : undefined}
        defaultValue={valor}
        onBlur={(e) => salvar(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditando(false);
        }}
        className="w-full min-w-[140px] rounded-[var(--radius-sm)] bg-surface-hover px-2 py-0.5 text-sm outline-none"
      />
    );
  }

  if (coluna.tipo === "link" && valor) {
    return (
      <span className="flex items-center gap-2">
        <a href={valor} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          abrir
        </a>
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Editar ${coluna.nome}`}
          className="text-fg-tertiary opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      title={valor || `Preencher ${coluna.nome}`}
      className="line-clamp-1 min-w-[60px] max-w-[260px] cursor-text text-left"
    >
      {valor ? exibirCampo(coluna.tipo, valor) : <span className="text-fg-tertiary">—</span>}
    </button>
  );
}

/** Seleção colorida (estilo Monday): escolhe, cria valor novo, troca a cor. */
function CelulaSelecao({
  valor,
  coluna,
  editor,
  aoEscolher,
}: {
  valor: string;
  coluna: ColunaDemanda;
  editor: EditorColunas;
  aoEscolher: (v: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => setAberto(false), []);
  const [novo, setNovo] = useState("");

  const opcoes = coluna.opcoes ?? [];
  const cor = (v: string) => coluna.cores?.[v] ?? corAuto(v);
  const c = valor ? cor(valor) : null;

  return (
    <>
      <button
        ref={ancora}
        type="button"
        onClick={() => setAberto((v) => !v)}
        title={valor || `Escolher ${coluna.nome}`}
        className="min-w-[90px] max-w-[200px] truncate rounded-full px-2.5 py-0.5 text-center text-xs font-medium"
        style={c ? { background: c, color: corTextoSobre(c) } : { color: "var(--foreground-tertiary)" }}
      >
        {valor || "—"}
      </button>

      {aberto && (
        <Popover ancora={ancora} aoFechar={fechar} largura={224}>
          <div className="flex flex-col gap-0.5">
            {opcoes.map((o) => (
              <div key={o} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    aoEscolher(o);
                    setAberto(false);
                  }}
                  className="flex-1 truncate rounded-[var(--radius-sm)] px-2 py-1 text-left text-xs font-medium"
                  style={{ background: cor(o), color: corTextoSobre(cor(o)) }}
                >
                  {o}
                </button>
                <input
                  type="color"
                  value={cor(o)}
                  onChange={(e) =>
                    editor.alterar(coluna.id, {
                      cores: { ...(coluna.cores ?? {}), [o]: e.target.value },
                    })
                  }
                  title="Cor deste valor"
                  className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
              </div>
            ))}
            {opcoes.length === 0 && (
              <p className="px-2 py-1 text-xs text-fg-tertiary">Nenhuma opção ainda.</p>
            )}
            {valor && (
              <button
                type="button"
                onClick={() => {
                  aoEscolher("");
                  setAberto(false);
                }}
                className="rounded-[var(--radius-sm)] px-2 py-1 text-left text-xs text-fg-tertiary hover:bg-surface-hover"
              >
                Limpar
              </button>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = novo.trim();
              if (!v) return;
              if (!opcoes.includes(v)) editor.alterar(coluna.id, { opcoes: [...opcoes, v] });
              aoEscolher(v);
              setNovo("");
              setAberto(false);
            }}
            className="mt-1.5 border-t border-border pt-1.5"
          >
            <input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder="Nova opção + Enter"
              className="w-full rounded-[var(--radius-sm)] bg-surface-hover px-2 py-1 text-xs outline-none"
            />
          </form>
        </Popover>
      )}
    </>
  );
}
