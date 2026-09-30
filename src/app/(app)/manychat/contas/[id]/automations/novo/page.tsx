import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { obterConta } from "@/lib/manychat-contas-consultas";
import { criarAutomacaoAction } from "@/app/(app)/manychat/contas/[id]/actions";
import { FormularioAutomacao } from "@/app/(app)/manychat/contas/[id]/_componentes/formulario-automacao";

export const metadata = { title: "Nova automação" };

export default async function PaginaNovaAutomacao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requererEscritorio();
  const { id } = await params;

  const conta = await obterConta(id);
  if (!conta) notFound();

  const criarParaConta = criarAutomacaoAction.bind(null, id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
      <Link
        href={`/manychat/contas/${id}`}
        className="inline-flex items-center gap-1 text-sm text-fg-tertiary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Nova automação</h1>
      <p className="text-sm text-fg-secondary">para @{conta.ig_username}</p>

      <div className="mt-6">
        <FormularioAutomacao contaId={id} acao={criarParaConta} rotuloEnvio="Criar automação" />
      </div>
    </main>
  );
}
