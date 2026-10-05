import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Table2 } from "lucide-react";
import { PlanilhaEditor } from "@/app/(app)/dashboard/_componentes/planilha-editor";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { obterOperacao, obterQuadro } from "@/lib/operacoes-consultas";
import { listarLinhas, obterColunasPlanilha } from "@/lib/planilha-consultas";

export const metadata = { title: "Planilha" };

export default async function PaginaPlanilha({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await requererEscritorio();
  const { id } = await params;

  const quadro = await obterQuadro(id);
  if (!quadro || quadro.tipo !== "planilha") notFound();

  const [operacao, pai, colunas, linhas] = await Promise.all([
    obterOperacao(quadro.operacao_id),
    quadro.quadro_pai_id ? obterQuadro(quadro.quadro_pai_id) : Promise.resolve(null),
    obterColunasPlanilha(id),
    listarLinhas(id),
  ]);

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-6 md:px-6">
      <header>
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-fg-tertiary">
          {operacao && (
            <>
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: operacao.cor }} />
              <span>{operacao.nome}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          {pai && (
            <>
              <Link href={`/dashboard/quadro/${pai.id}`} className="hover:text-foreground">
                {pai.nome}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
        </div>
        <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Table2 className="h-5 w-5" style={{ color: quadro.cor }} />
          {quadro.nome}
        </h1>
      </header>

      <PlanilhaEditor
        quadroId={quadro.id}
        colunas={colunas}
        linhasIniciais={linhas}
        ehChefe={perfil.papel === "chefe"}
      />
    </main>
  );
}
