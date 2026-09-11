import Link from "next/link";

/**
 * Marca do Nitro: ícone (as "linhas de velocidade") + o wordmark, na mesma
 * tipografia condensada do logo de referência. Usada na barra do topo e nas
 * telas de autenticação. Puramente visual — sem estado, sem dado.
 */
export function Marca({
  href,
  tamanho = "md",
}: {
  href?: string;
  tamanho?: "sm" | "md";
}) {
  const conteudo = (
    <span className={`marca ${tamanho === "sm" ? "marca-sm" : ""}`}>
      <span className="marca-icone" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="marca-nome">NITRO</span>
    </span>
  );

  if (!href) return conteudo;

  return (
    <Link href={href} className="marca-link" title="Nitro">
      {conteudo}
    </Link>
  );
}
