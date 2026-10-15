"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Janela de rolagem para tabelas largas: barra horizontal extra no topo,
 * sincronizada com a de baixo. Toda tabela com rolagem lateral deve usar isto
 * (ou a classe `.rolagem-tabela`) — ver comentário da classe no globals.css.
 *
 * Sincronia: quem começou a rolar ("dono") manda até parar por ~150 ms; o outro
 * só segue. Sem isso, o evento de scroll atrasado do seguidor escrevia de volta
 * uma posição velha no dono e as duas barras brigavam (tabela "tremendo" e
 * linhas desalinhadas ao arrastar a barra).
 */
export function TabelaRolavel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const conteudoRef = useRef<HTMLDivElement>(null);
  const dono = useRef<"topo" | "corpo" | null>(null);
  const soltar = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [largura, setLargura] = useState(0);
  const [temRolagem, setTemRolagem] = useState(false);

  // Mede a largura do conteúdo para a barra de cima (acompanha linhas/colunas novas).
  useEffect(() => {
    const conteudo = conteudoRef.current;
    const corpo = corpoRef.current;
    if (!conteudo || !corpo) return;
    const medir = () => {
      setLargura(conteudo.scrollWidth);
      setTemRolagem(conteudo.scrollWidth > corpo.clientWidth + 1);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(conteudo);
    ro.observe(corpo);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(soltar.current), []);

  function sincronizar(origem: "topo" | "corpo") {
    const topo = topRef.current;
    const corpo = corpoRef.current;
    if (!topo || !corpo) return;
    if (dono.current && dono.current !== origem) return;
    dono.current = origem;
    const [de, para] = origem === "topo" ? [topo, corpo] : [corpo, topo];
    if (para.scrollLeft !== de.scrollLeft) para.scrollLeft = de.scrollLeft;
    clearTimeout(soltar.current);
    soltar.current = setTimeout(() => (dono.current = null), 150);
  }

  return (
    <>
      <div
        ref={topRef}
        onScroll={() => sincronizar("topo")}
        aria-hidden
        className="rolagem-tabela overflow-x-auto overflow-y-hidden"
        style={{ height: 14, visibility: temRolagem ? "visible" : "hidden" }}
      >
        <div style={{ width: largura, height: 1 }} />
      </div>
      <div
        ref={corpoRef}
        onScroll={() => sincronizar("corpo")}
        className={`rolagem-tabela overflow-auto ${className}`}
      >
        <div ref={conteudoRef} className="w-max min-w-full">
          {children}
        </div>
      </div>
    </>
  );
}
