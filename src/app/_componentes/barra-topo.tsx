"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, LogOut, Search, SlidersHorizontal } from "lucide-react";
import { sair } from "@/app/auth/actions";
import { PainelNotificacoes } from "@/app/_componentes/painel-notificacoes";
import { ROTULO_PAPEL, type Papel } from "@/lib/demandas";
import type { Notificacao } from "@/lib/notificacoes";

/**
 * Barra do topo (estilo Trello): logo à esquerda, campo de busca ao centro,
 * sino de notificações e menu do perfil à direita. Fica fixa no topo e
 * atravessa toda a largura da área logada.
 */
export function BarraTopo({
  nome,
  email,
  papel,
  naoLidas,
  notificacoes,
}: {
  nome: string;
  email: string;
  papel: Papel;
  naoLidas: number;
  notificacoes: Notificacao[];
}) {
  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-sidebar px-2.5 sm:gap-3 sm:px-3">
      <Link
        href="/dashboard"
        className="flex shrink-0 items-center gap-2"
        title="Secretária"
      >
        <span className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] bg-accent text-[11px] font-semibold text-accent-foreground">
          S
        </span>
        <span className="hidden text-sm font-semibold sm:inline">Secretária</span>
      </Link>

      <Suspense fallback={<CampoBusca inicial="" />}>
        <CampoBuscaConectado />
      </Suspense>

      <div className="flex shrink-0 items-center gap-0.5">
        <PainelNotificacoes notificacoes={notificacoes} naoLidas={naoLidas} />
        <MenuPerfil nome={nome} email={email} papel={papel} />
      </div>
    </header>
  );
}

/** Liga o campo de busca aos parâmetros da URL (precisa de <Suspense> acima). */
function CampoBuscaConectado() {
  const parametros = useSearchParams();
  const inicial = parametros.get("q") ?? "";
  // `key` remonta o campo quando a URL muda por fora (voltar, limpar…),
  // deixando o valor sempre em sincronia sem setState dentro de effect.
  return <CampoBusca key={inicial} inicial={inicial} />;
}

function CampoBusca({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [termo, setTermo] = useState(inicial);

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    const q = termo.trim();
    router.push(q ? `/dashboard?q=${encodeURIComponent(q)}` : "/dashboard");
  }

  return (
    <form
      onSubmit={aoEnviar}
      role="search"
      className="mx-auto flex w-full max-w-2xl items-center"
    >
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
        <input
          type="search"
          name="q"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar demandas…"
          aria-label="Buscar demandas"
          className="campo !pl-8"
        />
      </div>
    </form>
  );
}

function MenuPerfil({
  nome,
  email,
  papel,
}: {
  nome: string;
  email: string;
  papel: Papel;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
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
  }, [aberto]);

  const iniciais =
    nome
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title={nome}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="grid h-8 w-8 place-items-center rounded-full bg-surface-active text-[11px] font-semibold text-accent-subtle-fg transition-[filter] hover:brightness-110"
      >
        {iniciais}
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-[var(--radius)] bg-overlay p-1"
          style={{ boxShadow: "var(--shadow-pop)", animation: "modal-in 0.12s ease" }}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{nome}</p>
            <p className="truncate text-xs text-fg-tertiary">{email}</p>
            <span className="pill pill-gray mt-1.5">{ROTULO_PAPEL[papel]}</span>
          </div>

          <div className="my-1 border-t border-border" />

          <Link
            href="/escritorio"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-fg-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Building2 className="h-4 w-4" />
            Escritório
          </Link>

          <Link
            href="/ajustes"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-fg-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Ajustes
          </Link>

          <form action={sair}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-fg-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
