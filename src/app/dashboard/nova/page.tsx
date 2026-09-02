import Link from "next/link";
import { criarDemanda } from "@/app/dashboard/actions";
import { FormularioDemanda } from "@/app/dashboard/_componentes/formulario-demanda";
import { requererUsuario } from "@/lib/auth";

export const metadata = { title: "Nova demanda" };

export default async function PaginaNovaDemanda() {
  await requererUsuario();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <Link href="/dashboard" className="text-sm text-zinc-500 underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Nova demanda</h1>

      <div className="mt-6">
        <FormularioDemanda acao={criarDemanda} rotuloEnvio="Criar demanda" />
      </div>
    </main>
  );
}
