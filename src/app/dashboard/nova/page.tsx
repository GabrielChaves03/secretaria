import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { criarDemanda } from "@/app/dashboard/actions";
import { FormularioDemanda } from "@/app/dashboard/_componentes/formulario-demanda";
import { requererUsuario } from "@/lib/auth";

export const metadata = { title: "Nova demanda" };

export default async function PaginaNovaDemanda() {
  await requererUsuario();

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
        Nova demanda
      </h1>

      <div className="mt-6">
        <FormularioDemanda acao={criarDemanda} rotuloEnvio="Criar demanda" />
      </div>
    </main>
  );
}
