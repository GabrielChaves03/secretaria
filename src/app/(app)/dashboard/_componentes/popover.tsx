"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Menu suspenso preso a um elemento-âncora, renderizado no <body> (portal).
 * Serve para menus dentro de tabelas com rolagem: lá dentro um `absolute` fica
 * cortado pelo overflow e um `fixed` fica preso ao transform da
 * `.rolagem-tabela`. Abre embaixo da âncora (ou em cima, se não couber),
 * acompanha a rolagem e fecha com clique fora ou Esc.
 */
export function Popover({
  ancora,
  aoFechar,
  largura = 224,
  children,
}: {
  ancora: RefObject<HTMLElement | null>;
  aoFechar: () => void;
  largura?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    function posicionar() {
      const a = ancora.current?.getBoundingClientRect();
      const altura = ref.current?.offsetHeight ?? 0;
      if (!a) return;
      const cabeEmbaixo = a.bottom + 4 + altura <= window.innerHeight - 8;
      const top = cabeEmbaixo ? a.bottom + 4 : Math.max(8, a.top - 4 - altura);
      const left = Math.min(Math.max(8, a.left), window.innerWidth - largura - 8);
      setPos({ top, left });
    }
    posicionar();
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
    return () => {
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  }, [ancora, largura]);

  useEffect(() => {
    function fora(e: MouseEvent) {
      const alvo = e.target as Node;
      if (ref.current?.contains(alvo) || ancora.current?.contains(alvo)) return;
      aoFechar();
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [ancora, aoFechar]);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[60] rounded-[var(--radius)] bg-overlay p-1.5"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: largura,
        boxShadow: "var(--shadow-pop)",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
