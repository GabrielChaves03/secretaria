import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { obterAutomacao } from "@/lib/manychat-automacoes-consultas";
import { atualizarAutomacaoAction, apagarAutomacaoAction } from "@/app/(app)/manychat/contas/[id]/actions";
import { FormularioAutomacao } from "@/app/(app)/manychat/contas/[id]/_componentes/formulario-automacao";
import { FormComConfirmacao } from "@/app/(app)/manychat/_componentes/form-com-confirmacao";

export const metadata = { title: "Editar automação" };

export default async function PaginaEditarAutomacao({
  params,
}: {
  params: Promise<{ id: string; automationId: string }>;
}) {
  await requererEscritorio();
  const { id, automationId } = await params;

  const automacao = await obterAutomacao(automationId);
  if (!automacao || automacao.instagram_account_id !== id) notFound();

  const atualizarParaConta = atualizarAutomacaoAction.bind(null, id, automationId);
  const apagarParaConta = apagarAutomacaoAction.bind(null, id, automationId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
      <Link
        href={`/manychat/contas/${id}`}
        className="inline-flex items-center gap-1 text-sm text-fg-tertiary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Editar automação</h1>

      <div className="mt-6">
        <FormularioAutomacao
          contaId={id}
          acao={atualizarParaConta}
          automacao={automacao}
          rotuloEnvio="Salvar alterações"
        />
      </div>

      <section className="mt-8 border-t border-border pt-6">
        <FormComConfirmacao
          acao={apagarParaConta}
          mensagem={`Excluir "${automacao.name}"? Essa ação não pode ser desfeita — a automação para de responder imediatamente.`}
        >
          <button type="submit" className="btn btn-danger btn-sm">
            <Trash2 className="h-3.5 w-3.5" />
            Excluir automação
          </button>
        </FormComConfirmacao>
      </section>
    </main>
  );
}
