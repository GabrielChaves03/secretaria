import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDot, ListTodo } from "lucide-react";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { listarMembros } from "@/lib/escritorios-consultas";
import { listarOperacoesComQuadros } from "@/lib/operacoes-consultas";
import { obterConfigDemandas } from "@/lib/demandas-config-consultas";
import { corDoStatus, type ConfigDemandas } from "@/lib/demandas-config";
import { ehConcluido, estaAtrasada, hojeISO, type DemandaComDono } from "@/lib/demandas";

export const metadata = { title: "Métricas" };

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const FMT_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

/** yyyy-mm-dd somando dias (meio-dia UTC evita virar o dia por fuso). */
function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

type Resumo = {
  total: number;
  abertas: number;
  concluidas: number;
  atrasadas: number;
  vencem7: number;
  porStatus: Record<string, number>;
};

function resumir(demandas: DemandaComDono[], hoje: string, limite7: string): Resumo {
  const r: Resumo = { total: 0, abertas: 0, concluidas: 0, atrasadas: 0, vencem7: 0, porStatus: {} };
  for (const d of demandas) {
    r.total++;
    r.porStatus[d.status] = (r.porStatus[d.status] ?? 0) + 1;
    if (ehConcluido(d.status)) r.concluidas++;
    else {
      r.abertas++;
      if (estaAtrasada(d, hoje)) r.atrasadas++;
      else if (d.data_entrega && d.data_entrega <= limite7) r.vencem7++;
    }
  }
  return r;
}

const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

/**
 * Painel de métricas. Chefe vê o escritório inteiro; funcionário vê só os
 * próprios números (a RLS de `demandas` já devolve só as dele).
 */
export default async function PaginaMetricas() {
  const perfil = await requererEscritorio();
  const ehChefe = perfil.papel === "chefe";
  const hoje = hojeISO();
  const limite7 = somarDias(hoje, 7);

  const [demandas, config, operacoes, membros] = await Promise.all([
    listarDemandas(undefined, undefined, ehChefe ? undefined : perfil.id),
    obterConfigDemandas(),
    listarOperacoesComQuadros(),
    ehChefe ? listarMembros() : Promise.resolve(undefined),
  ]);

  const geral = resumir(demandas, hoje, limite7);

  // ---- Por operação → quadros (só quadros de tarefas) ----
  const porQuadro = new Map<string, DemandaComDono[]>();
  for (const d of demandas) {
    if (!d.quadro_id) continue;
    const arr = porQuadro.get(d.quadro_id) ?? [];
    arr.push(d);
    porQuadro.set(d.quadro_id, arr);
  }
  const blocosOperacao = operacoes
    .map((o) => {
      const quadros = o.quadros
        .flatMap((q) => [q, ...q.filhos])
        .filter((q) => q.tipo === "tarefas")
        .map((q) => ({ id: q.id, nome: q.nome, cor: q.cor, r: resumir(porQuadro.get(q.id) ?? [], hoje, limite7) }));
      const todas = quadros.flatMap((q) => porQuadro.get(q.id) ?? []);
      return { id: o.id, nome: o.nome, cor: o.cor, quadros, r: resumir(todas, hoje, limite7) };
    })
    .filter((o) => o.quadros.length > 0);

  // ---- Por colaborador ----
  const pessoas = ehChefe
    ? (membros ?? []).map((m) => ({ id: m.id, nome: m.nome ?? "Sem nome", papel: m.papel }))
    : [{ id: perfil.id, nome: perfil.nome ?? "Você", papel: perfil.papel }];
  const linhasPessoa = pessoas
    .map((p) => ({
      ...p,
      r: resumir(demandas.filter((d) => d.usuario_id === p.id), hoje, limite7),
    }))
    .sort((a, b) => b.r.atrasadas - a.r.atrasadas || b.r.abertas - a.r.abertas);

  // ---- Prazos da semana ----
  const nomeQuadro = new Map<string, string>();
  for (const o of operacoes)
    for (const q of o.quadros.flatMap((q) => [q, ...q.filhos])) nomeQuadro.set(q.id, q.nome);
  const abertasComPrazo = demandas
    .filter((d) => !ehConcluido(d.status) && d.data_entrega && d.data_entrega <= limite7)
    .sort((a, b) => (a.data_entrega! < b.data_entrega! ? -1 : 1));
  const atrasadas = abertasComPrazo.filter((d) => d.data_entrega! < hoje);
  const deHoje = abertasComPrazo.filter((d) => d.data_entrega === hoje);
  const proximas = abertasComPrazo.filter((d) => d.data_entrega! > hoje);

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-6 md:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Métricas</h1>
        <p className="mt-0.5 text-sm text-fg-secondary">
          {ehChefe ? "Visão do escritório inteiro." : "Seus números, em todos os quadros."}
        </p>
      </header>

      {/* KPIs */}
      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi Icone={ListTodo} rotulo="Total" valor={geral.total} />
        <Kpi Icone={CircleDot} rotulo="Em aberto" valor={geral.abertas} />
        <Kpi
          Icone={CheckCircle2}
          rotulo="Concluídas"
          valor={geral.concluidas}
          detalhe={`${pct(geral.concluidas, geral.total)}% do total`}
        />
        <Kpi Icone={AlertTriangle} rotulo="Atrasadas" valor={geral.atrasadas} alerta={geral.atrasadas > 0} />
        <Kpi Icone={CalendarClock} rotulo="Vencem em 7 dias" valor={geral.vencem7} />
      </section>

      {geral.total === 0 && (
        <div className="cartao mt-5 px-5 py-10 text-center text-sm text-fg-tertiary">
          Ainda não há demandas{ehChefe ? " no escritório" : " suas"}. Os números aparecem aqui
          assim que elas forem criadas.
        </div>
      )}

      {geral.total > 0 && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Por operação */}
            <section className="cartao min-w-0 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Por operação</h2>
                <LegendaStatus config={config} />
              </div>
              <div className="mt-3 flex flex-col gap-4">
                {blocosOperacao.map((o) => (
                  <div key={o.id}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: o.cor }} />
                      <span className="font-medium">{o.nome}</span>
                      <span className="ml-auto text-xs text-fg-tertiary">
                        {o.r.total} · {pct(o.r.concluidas, o.r.total)}% concluído
                        {o.r.atrasadas > 0 && (
                          <span className="text-danger"> · {o.r.atrasadas} atrasada{o.r.atrasadas > 1 ? "s" : ""}</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5 pl-4">
                      {o.quadros.map((q) => (
                        <Link
                          key={q.id}
                          href={`/dashboard/quadro/${q.id}`}
                          className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-sm)] px-1 py-1 text-xs transition-colors hover:bg-surface-hover"
                        >
                          <span className="truncate text-fg-secondary">{q.nome}</span>
                          <BarraStatus r={q.r} config={config} />
                          <span className="w-16 text-right tabular-nums text-fg-tertiary">
                            {q.r.total === 0 ? "vazio" : `${q.r.concluidas}/${q.r.total}`}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                {blocosOperacao.length === 0 && (
                  <p className="text-sm text-fg-tertiary">Nenhum quadro de tarefas ainda.</p>
                )}
              </div>
            </section>

            {/* Por colaborador */}
            <section className="cartao min-w-0 p-4">
              <h2 className="text-sm font-semibold">
                {ehChefe ? "Por colaborador" : "Seu desempenho"}
              </h2>
              <div className="rolagem-tabela mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-fg-tertiary">
                      <th className="py-2 pr-3 font-medium">Pessoa</th>
                      <th className="px-2 py-2 text-right font-medium">Total</th>
                      <th className="px-2 py-2 text-right font-medium">Em aberto</th>
                      <th className="px-2 py-2 text-right font-medium">Concluídas</th>
                      <th className="px-2 py-2 text-right font-medium">Atrasadas</th>
                      <th className="px-2 py-2 text-right font-medium">Vencem 7d</th>
                      <th className="py-2 pl-3 font-medium">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasPessoa.map((p) => {
                      const prog = pct(p.r.concluidas, p.r.total);
                      return (
                        <tr key={p.id} className="border-b border-border/50">
                          <td className="py-2 pr-3">
                            <span className="text-foreground">{p.nome}</span>
                            {p.id === perfil.id && ehChefe && (
                              <span className="ml-1 text-xs text-fg-tertiary">(você)</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.r.total}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.r.abertas}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.r.concluidas}</td>
                          <td
                            className={`px-2 py-2 text-right tabular-nums ${p.r.atrasadas > 0 ? "font-medium text-danger" : ""}`}
                          >
                            {p.r.atrasadas}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.r.vencem7}</td>
                          <td className="py-2 pl-3">
                            <div className="flex min-w-[120px] items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${prog}%`, background: "var(--accent)" }}
                                />
                              </div>
                              <span className="w-9 text-right text-xs tabular-nums text-fg-tertiary">
                                {prog}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Prazos da semana */}
          <section className="cartao min-w-0 self-start p-4">
            <h2 className="text-sm font-semibold">Prazos da semana</h2>
            <ListaPrazos
              titulo="Atrasadas"
              itens={atrasadas}
              tom="perigo"
              nomeQuadro={nomeQuadro}
              mostrarDono={ehChefe}
            />
            <ListaPrazos titulo="Vencem hoje" itens={deHoje} tom="aviso" nomeQuadro={nomeQuadro} mostrarDono={ehChefe} />
            <ListaPrazos
              titulo="Próximos 7 dias"
              itens={proximas}
              tom="neutro"
              nomeQuadro={nomeQuadro}
              mostrarDono={ehChefe}
            />
            {abertasComPrazo.length === 0 && (
              <p className="mt-3 text-sm text-fg-tertiary">Nada vencendo nos próximos 7 dias.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Kpi({
  Icone,
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  Icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: number;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <div className="cartao px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-fg-tertiary">
        <Icone className={`h-3.5 w-3.5 ${alerta ? "text-danger" : ""}`} />
        {rotulo}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{valor}</div>
      {detalhe && <div className="text-xs text-fg-tertiary">{detalhe}</div>}
    </div>
  );
}

/** Barra empilhada por status (cores dos status do escritório, 2px de respiro entre fatias). */
function BarraStatus({ r, config }: { r: Resumo; config: ConfigDemandas }) {
  if (r.total === 0) return <div className="h-2 rounded-full bg-border/60" />;
  const ordem = [
    ...config.statuses,
    ...Object.keys(r.porStatus).filter((s) => !config.statuses.includes(s)),
  ];
  return (
    <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
      {ordem
        .filter((s) => r.porStatus[s])
        .map((s) => (
          <div
            key={s}
            title={`${s}: ${r.porStatus[s]} (${pct(r.porStatus[s], r.total)}%)`}
            style={{ flexGrow: r.porStatus[s], background: corDoStatus(config, s) }}
          />
        ))}
    </div>
  );
}

function LegendaStatus({ config }: { config: ConfigDemandas }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-tertiary">
      {config.statuses.map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: corDoStatus(config, s) }} />
          {s}
        </span>
      ))}
    </div>
  );
}

function ListaPrazos({
  titulo,
  itens,
  tom,
  nomeQuadro,
  mostrarDono,
}: {
  titulo: string;
  itens: DemandaComDono[];
  tom: "perigo" | "aviso" | "neutro";
  nomeQuadro: Map<string, string>;
  mostrarDono: boolean;
}) {
  if (itens.length === 0) return null;
  const corData =
    tom === "perigo" ? "text-danger" : tom === "aviso" ? "text-warning" : "text-fg-secondary";
  return (
    <div className="mt-4">
      <p className="rotulo text-xs">
        {titulo} <span className="text-fg-tertiary">· {itens.length}</span>
      </p>
      <ul className="mt-1.5 flex flex-col">
        {itens.map((d) => {
          const data = new Date(`${d.data_entrega}T00:00:00`);
          return (
            <li key={d.id}>
              <Link
                href={`/dashboard/${d.id}/editar`}
                className="flex items-baseline gap-3 rounded-[var(--radius-sm)] px-1.5 py-1.5 text-sm transition-colors hover:bg-surface-hover"
              >
                <span className={`w-16 shrink-0 text-xs tabular-nums ${corData}`}>
                  {tom === "neutro" ? `${FMT_SEMANA.format(data)} ${FMT_DATA.format(data)}` : FMT_DATA.format(data)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">{d.titulo}</span>
                  <span className="block truncate text-xs text-fg-tertiary">
                    {[d.quadro_id ? nomeQuadro.get(d.quadro_id) : null, mostrarDono ? d.dono_nome : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
