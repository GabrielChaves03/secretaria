"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  MessageSquare,
  Pencil,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { marcarNotificacoesLidas } from "@/app/dashboard/actions";
import type { Notificacao, TipoNotificacao } from "@/lib/notificacoes";

const ICONE: Record<TipoNotificacao, LucideIcon> = {
  comentario: MessageSquare,
  status: Check,
  edicao: Pencil,
  atribuicao: UserPlus,
};

const FMT_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** "agora", "há 5 min", "há 3 h", "ontem" ou a data curta. */
function tempoRelativo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  return FMT_DATA_HORA.format(new Date(iso));
}

/**
 * Sino de notificações da barra do topo com painel suspenso (estilo Trello):
 * lista as notificações, alterna "apenas não lidas" e marca todas como lidas.
 */
export function PainelNotificacoes({
  notificacoes,
  naoLidas,
}: {
  notificacoes: Notificacao[];
  naoLidas: number;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  useEffect(() => {
    if (!aberto) return;
    // Traz as notificações mais recentes do servidor ao abrir.
    router.refresh();
    const aoClicarFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, router]);

  const lista = apenasNaoLidas
    ? notificacoes.filter((n) => !n.lida)
    : notificacoes;

  function marcarTodas() {
    iniciarTransicao(async () => {
      await marcarNotificacoesLidas();
      router.refresh();
    });
  }

  function abrirDemanda(demandaId: string | null) {
    setAberto(false);
    if (demandaId) router.push(`/dashboard/${demandaId}/editar`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Notificações"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={`brilho-hover relative grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] ${
          aberto
            ? "bg-surface-active text-foreground"
            : "text-fg-secondary hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-0.5 text-[9px] font-semibold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 top-full z-50 mt-1.5 flex max-h-[min(32rem,80vh)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-overlay"
          style={{ boxShadow: "var(--shadow-pop)", animation: "modal-in 0.12s ease" }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <h2 className="text-sm font-semibold">Notificações</h2>
            <button
              type="button"
              onClick={() => setApenasNaoLidas((v) => !v)}
              className="flex items-center gap-2 text-[12px] text-fg-secondary transition-colors hover:text-foreground"
              aria-pressed={apenasNaoLidas}
            >
              Apenas não lidas
              <span
                className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                  apenasNaoLidas ? "bg-accent" : "bg-border-strong"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left] ${
                    apenasNaoLidas ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="border-t border-border" />

          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {lista.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <BellOff className="h-7 w-7 text-fg-tertiary" />
                <p className="text-sm text-fg-tertiary">
                  {apenasNaoLidas
                    ? "Nenhuma notificação não lida"
                    : "Nenhuma notificação"}
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {lista.map((n) => {
                  const Icone = ICONE[n.tipo] ?? Bell;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => abrirDemanda(n.demanda_id)}
                        className={`brilho-hover flex w-full items-start gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-left ${
                          n.lida
                            ? "hover:bg-surface-hover"
                            : "bg-accent-subtle-bg hover:brightness-95"
                        } ${n.demanda_id ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <Icone className="mt-0.5 h-4 w-4 shrink-0 text-fg-tertiary" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] leading-snug text-foreground">
                            {n.descricao}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-fg-tertiary">
                            {tempoRelativo(n.criado_em)}
                          </span>
                        </span>
                        {!n.lida && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {naoLidas > 0 && (
            <>
              <div className="border-t border-border" />
              <button
                type="button"
                onClick={marcarTodas}
                disabled={pendente}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-medium text-fg-secondary transition-colors hover:text-foreground disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Marcar todas como lidas
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
