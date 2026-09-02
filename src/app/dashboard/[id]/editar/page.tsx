import Link from "next/link";
import { notFound } from "next/navigation";
import { atualizarDemanda } from "@/app/dashboard/actions";
import { FormularioDemanda } from "@/app/dashboard/_componentes/formulario-demanda";
import { BlocoComentarios } from "@/app/dashboard/_componentes/bloco-comentarios";
import { obterPerfil } from "@/lib/perfil-consultas";
import { obterDemanda } from "@/lib/demandas-consultas";
import { listarComentarios } from "@/lib/comentarios-consultas";

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

  const comentarios = await listarComentarios(demanda.id);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <Link href="/dashboard" className="text-sm text-zinc-500 underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        Editar demanda
      </h1>

      <div className="mt-6">
        <FormularioDemanda
          acao={atualizarDemanda}
          demanda={demanda}
          rotuloEnvio="Salvar alterações"
        />
      </div>

      <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-semibold tracking-tight">Comentários</h2>
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
