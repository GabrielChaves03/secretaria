import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Anton } from "next/font/google";
import { obterUrlFundoAtual } from "@/lib/aparencia-consultas";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Fonte de destaque (a condensada do logo do Nitro) — usada só nos títulos
// grandes das telas de autenticação (classe utilitária `font-display`),
// nunca no texto corrido.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Gestão de Demandas Internas",
    template: "%s · Gestão de Demandas Internas",
  },
  description: "Aplicação interna para gestão de demandas da empresa.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Fundo de tela é pessoal (usuários.imagem_fundo, escolhido em /ajustes) —
  // roda em toda página, inclusive as públicas (sem sessão cai no padrão).
  const urlFundo = await obterUrlFundoAtual();

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${plexMono.variable} ${anton.variable} h-full`}
    >
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
        style={{ "--fundo-imagem": `url(${urlFundo})` } as CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
