import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { atualizarDemanda } from "@/app/(app)/dashboard/actions";
import { FormularioDemanda } from "@/app/(app)/dashboard/_componentes/formulario-demanda";
import { BlocoComentarios } from "@/app/(app)/dashboard/_componentes/bloco-comentarios";
import { obterPerfil } from "@/lib/perfil-consultas";
import { obterDemanda } from "@/lib/demandas-consultas";
import { listarComentarios } from "@/lib/comentarios-consultas";
import { listarMembros } from "@/lib/escritorios-consultas";

export const metadata = { title: "Editar demanda" };

export default async function PaginaEditarDemanda({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await obterPerfil();
  const { id } = await params;

  const demanda = await obterDemanda(id);
  if (!demanda) notFound();

  const [comentarios, membros] = await Promise.all([
    listarComentarios(demanda.id),
    perfil.papel === "chefe" ? listarMembros() : Promise.resolve(undefined),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-8 md:px-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-fg-tertiary transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Demandas
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Editar demanda
      </h1>

      <div className="mt-6">
        <FormularioDemanda
          acao={atualizarDemanda}
          demanda={demanda}
          rotuloEnvio="Salvar alterações"
          membros={membros}
          usuarioId={perfil.id}
        />
      </div>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="rotulo">Comentários</h2>
        <div className="mt-3">
          <BlocoComentarios
            demandaId={demanda.id}
            comentarios={comentarios}
            usuarioId={perfil.id}
          />
        </div>
      </section>
    </main>
  );
}
