"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Inbox,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { apagarDemanda, moverDemanda } from "@/app/(app)/dashboard/actions";
import { BlocoComentarios } from "@/app/(app)/dashboard/_componentes/bloco-comentarios";
import { Modal } from "@/app/(app)/dashboard/_componentes/modal";
import type { Comentario } from "@/lib/comentarios-consultas";
import {
  PILL_DIFICULDADE,
  PILL_PRIORIDADE,
  ROTULO_DIFICULDADE,
  type DemandaComDono,
} from "@/lib/demandas";

const FMT_DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

/** Uma coluna do quadro = um status configurado. token/destino = "status:<nome>". */
export type ColunaQuadro = {
  token: string;
  destino: string;
  titulo: string;
  /** Cor do status (fundo do cabeçalho). */
  cor?: string;
};

export type CartaoDemanda = DemandaComDono & {
  atrasada: boolean;
  /** token da coluna onde o card está agora: "status:<nome>". */
  tokenAtual: string;
};

export function QuadroDemandas({
  colunas,
  cardsPorColuna,
  comentariosPorDemanda,
  usuarioId,
  statuses,
  mostrarDono = false,
}: {
  colunas: ColunaQuadro[];
  cardsPorColuna: Record<string, CartaoDemanda[]>;
  comentariosPorDemanda: Record<string, Comentario[]>;
  usuarioId: string;
  /** Status configurados — usados no menu "Mover para". */
  statuses: string[];
  /** Mostra o nome do responsável no card (visão da equipe). */
  mostrarDono?: boolean;
}) {
  const router = useRouter();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  // Movimento otimista: o card troca de coluna na hora; o refresh confirma.
  const [ov, setOv] = useState<{
    base: Record<string, CartaoDemanda[]>;
    mapa: Record<string, string>;
  }>({ base: cardsPorColuna, mapa: {} });
  const overrides = useMemo(
    () => (ov.base === cardsPorColuna ? ov.mapa : {}),
    [ov, cardsPorColuna],
  );
  const setOverride = (demandaId: string, token: string) =>
    setOv({ base: cardsPorColuna, mapa: { ...overrides, [demandaId]: token } });

  const colunasView = useMemo(() => {
    if (Object.keys(overrides).length === 0) return cardsPorColuna;
    const base: Record<string, CartaoDemanda[]> = {};
    for (const tk of Object.keys(cardsPorColuna)) base[tk] = [];
    for (const arr of Object.values(cardsPorColuna)) {
      for (const c of arr) {
        const tk = overrides[c.id] ?? c.tokenAtual;
        (base[tk] ??= []).push(tk === c.tokenAtual ? c : { ...c, tokenAtual: tk });
      }
    }
    return base;
  }, [cardsPorColuna, overrides]);

  const cardsById = useMemo(() => {
    const m: Record<string, CartaoDemanda> = {};
    for (const arr of Object.values(colunasView)) {
      for (const c of arr) m[c.id] = c;
    }
    return m;
  }, [colunasView]);

  function mover(demandaId: string, destino: string) {
    const card = cardsById[demandaId];
    if (!card) return;
    setOverride(demandaId, destino); // token === destino (ambos "status:<nome>")
    iniciar(async () => {
      await moverDemanda(demandaId, destino);
      router.refresh();
    });
  }

  function soltarEm(coluna: ColunaQuadro) {
    const id = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (!id || cardsById[id]?.tokenAtual === coluna.token) return;
    mover(id, coluna.destino);
  }

  return (
    <div className="mt-4 flex flex-1 flex-col gap-4 md:flex-row md:items-start md:overflow-x-auto md:pb-2">
      {colunas.map((coluna) => (
        <Coluna
          key={coluna.token}
          coluna={coluna}
          cards={colunasView[coluna.token] ?? []}
          comentariosPorDemanda={comentariosPorDemanda}
          usuarioId={usuarioId}
          statuses={statuses}
          mostrarDono={mostrarDono}
          arrastando={arrastando}
          alvoAtivo={alvo === coluna.token}
          onEntrarAlvo={() => setAlvo(coluna.token)}
          onSairAlvo={() => setAlvo((a) => (a === coluna.token ? null : a))}
          onSoltar={() => soltarEm(coluna)}
          onInicioArraste={setArrastando}
          onFimArraste={() => {
            setArrastando(null);
            setAlvo(null);
          }}
          onMover={mover}
        />
      ))}
    </div>
  );
}

function Coluna({
  coluna,
  cards,
  comentariosPorDemanda,
  usuarioId,
  statuses,
  mostrarDono,
  arrastando,
  alvoAtivo,
  onEntrarAlvo,
  onSairAlvo,
  onSoltar,
  onInicioArraste,
  onFimArraste,
  onMover,
}: {
  coluna: ColunaQuadro;
  cards: CartaoDemanda[];
  comentariosPorDemanda: Record<string, Comentario[]>;
  usuarioId: string;
  statuses: string[];
  mostrarDono: boolean;
  arrastando: string | null;
  alvoAtivo: boolean;
  onEntrarAlvo: () => void;
  onSairAlvo: () => void;
  onSoltar: () => void;
  onInicioArraste: (id: string) => void;
  onFimArraste: () => void;
  onMover: (demandaId: string, destino: string) => void;
}) {
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        if (!alvoAtivo) onEntrarAlvo();
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onSairAlvo();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onSoltar();
      }}
      className={`flex w-full shrink-0 flex-col rounded-[var(--radius-lg)] bg-sidebar transition-shadow md:w-[19.5rem] ${
        alvoAtivo
          ? "shadow-[inset_0_0_0_2px_var(--accent)]"
          : "shadow-[inset_0_0_0_1px_var(--border)]"
      }`}
    >
      <div
        className="flex items-center gap-2 rounded-t-[var(--radius-lg)] border-b border-border/60 px-3.5 py-3"
        style={
          coluna.cor
            ? {
                background: `${coluna.cor}22`,
                boxShadow: `inset 3px 0 0 ${coluna.cor}`,
              }
            : undefined
        }
      >
        {coluna.cor && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: coluna.cor }}
          />
        )}
        <h2 className="truncate text-sm font-semibold">{coluna.titulo}</h2>
        <span className="ml-auto shrink-0 rounded-full bg-surface-hover px-1.5 text-xs font-medium text-fg-secondary">
          {cards.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2.5 px-2.5 py-2.5 md:max-h-[calc(100vh-13rem)] md:overflow-y-auto">
        {cards.length === 0 && (
          <li
            className={`flex flex-col items-center gap-1.5 rounded-[var(--radius)] border border-dashed px-3 py-8 text-center text-xs transition-colors ${
              arrastando
                ? "border-accent/50 bg-accent-subtle-bg text-accent-subtle-fg"
                : "border-border text-fg-tertiary"
            }`}
          >
            <Inbox className="h-4 w-4" strokeWidth={1.5} />
            {arrastando ? "Solte aqui" : "Nada por aqui ainda."}
          </li>
        )}
        {cards.map((d) => (
          <Cartao
            key={d.id}
            demanda={d}
            usuarioId={usuarioId}
            statuses={statuses}
            mostrarDono={mostrarDono}
            comentarios={comentariosPorDemanda[d.id] ?? []}
            arrastando={arrastando === d.id}
            onInicioArraste={onInicioArraste}
            onFimArraste={onFimArraste}
            onMover={onMover}
          />
        ))}
      </ul>
    </section>
  );
}

function Cartao({
  demanda: d,
  usuarioId,
  statuses,
  mostrarDono,
  comentarios,
  arrastando,
  onInicioArraste,
  onFimArraste,
  onMover,
}: {
  demanda: CartaoDemanda;
  usuarioId: string;
  statuses: string[];
  mostrarDono: boolean;
  comentarios: Comentario[];
  arrastando: boolean;
  onInicioArraste: (id: string) => void;
  onFimArraste: () => void;
  onMover: (demandaId: string, destino: string) => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [comentariosAberto, setComentariosAberto] = useState(false);

  function aoIniciar(e: DragEvent<HTMLLIElement>) {
    const alvo = e.target as HTMLElement;
    if (alvo.closest("input,textarea,button,a,select,summary,label")) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", d.id);
    onInicioArraste(d.id);
  }

  return (
    <li
      draggable
      onDragStart={aoIniciar}
      onDragEnd={onFimArraste}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      className={`cartao-demanda group py-3 pl-4 pr-3 ${arrastando ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        aria-label="Ações do card"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMenu({ x: r.right, y: r.bottom + 4 });
        }}
        className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] bg-raised text-fg-tertiary shadow-[inset_0_0_0_1px_var(--border)] transition-opacity hover:text-foreground ${
          menu ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
        }`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <p className="pr-8 text-[13px] font-semibold leading-snug text-foreground">
        {d.titulo}
      </p>

      {mostrarDono && d.dono_nome && (
        <p className="mt-1 text-xs text-fg-tertiary">{d.dono_nome}</p>
      )}

      {d.descricao && (
        <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-xs text-fg-secondary">
          {d.descricao}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5 text-[11px] text-fg-secondary">
        {d.prioridade && (
          <span className={PILL_PRIORIDADE[d.prioridade] ?? "pill pill-gray"}>
            {d.prioridade}
          </span>
        )}
        <span className={PILL_DIFICULDADE[d.dificuldade]}>
          {ROTULO_DIFICULDADE[d.dificuldade]}
        </span>
        <span
          className={
            d.atrasada ? "flex items-center gap-1 font-medium text-danger" : ""
          }
        >
          {d.atrasada && <AlertTriangle className="h-3 w-3" />}
          {d.data_entrega
            ? FMT_DATA.format(new Date(`${d.data_entrega}T00:00:00`))
            : "sem prazo"}
        </span>
        {d.link && (
          <a
            href={d.link}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            link
          </a>
        )}
      </div>

      {menu && (
        <MenuCartao
          pos={menu}
          demanda={d}
          statuses={statuses}
          onMover={(destino) => {
            onMover(d.id, destino);
            setMenu(null);
          }}
          onComentario={() => {
            setComentariosAberto(true);
            setMenu(null);
          }}
          onFechar={() => setMenu(null)}
        />
      )}

      {comentariosAberto && (
        <Modal
          titulo={`Comentários — ${d.titulo}`}
          aoFechar={() => setComentariosAberto(false)}
        >
          <BlocoComentarios
            demandaId={d.id}
            comentarios={comentarios}
            usuarioId={usuarioId}
          />
        </Modal>
      )}
    </li>
  );
}

function MenuCartao({
  pos,
  demanda: d,
  statuses,
  onMover,
  onComentario,
  onFechar,
}: {
  pos: { x: number; y: number };
  demanda: CartaoDemanda;
  statuses: string[];
  onMover: (destino: string) => void;
  onComentario: () => void;
  onFechar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [moverAberto, setMoverAberto] = useState(false);
  const [estilo, setEstilo] = useState<CSSProperties>({
    left: pos.x,
    top: pos.y,
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const m = 8;
    let left = pos.x;
    let top = pos.y;
    if (left + width + m > window.innerWidth) left = pos.x - width;
    if (top + height + m > window.innerHeight) top = window.innerHeight - height - m;
    setEstilo({
      left: Math.max(m, left),
      top: Math.max(m, top),
      visibility: "visible",
    });
  }, [pos, moverAberto]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onFechar();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", onFechar);
    window.addEventListener("scroll", onFechar, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", onFechar);
      window.removeEventListener("scroll", onFechar, true);
    };
  }, [onFechar]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ position: "fixed", zIndex: 60, boxShadow: "var(--shadow-pop)", ...estilo }}
      className="w-52 rounded-[var(--radius)] bg-overlay p-1 text-sm"
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuItemLink href={`/dashboard/${d.id}/editar`} Icone={Pencil}>
        Editar
      </MenuItemLink>

      <MenuItemBotao Icone={MessageSquare} onClick={onComentario}>
        Comentário
      </MenuItemBotao>

      <MenuItemBotao
        Icone={ArrowRight}
        onClick={() => setMoverAberto((v) => !v)}
        sufixo={
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform ${moverAberto ? "rotate-90" : ""}`}
          />
        }
      >
        Mover para
      </MenuItemBotao>

      {moverAberto && (
        <div className="my-0.5 ml-3 border-l border-border pl-1">
          {statuses.map((s) => {
            const atual = d.status === s;
            return (
              <button
                key={s}
                type="button"
                role="menuitem"
                onClick={() => onMover(`status:${s}`)}
                className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left transition-colors hover:bg-surface-hover ${
                  atual ? "font-medium text-foreground" : "text-fg-secondary hover:text-foreground"
                }`}
              >
                {atual ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{s}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="my-1 border-t border-border" />

      <form action={apagarDemanda}>
        <input type="hidden" name="id" value={d.id} />
        <button
          type="submit"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-danger transition-colors hover:bg-surface-hover"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          Excluir
        </button>
      </form>
    </div>,
    document.body,
  );
}

function MenuItemLink({
  href,
  Icone,
  children,
}: {
  href: string;
  Icone: typeof Pencil;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-fg-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <Icone className="h-3.5 w-3.5 shrink-0" />
      {children}
    </Link>
  );
}

function MenuItemBotao({
  Icone,
  onClick,
  sufixo,
  children,
}: {
  Icone: typeof Pencil;
  onClick: () => void;
  sufixo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-fg-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <Icone className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{children}</span>
      {sufixo}
    </button>
  );
}
