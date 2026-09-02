import Link from "next/link";
import { FormularioLogin } from "./formulario-login";

export const metadata = { title: "Entrar" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ confirmar?: string }>;
}) {
  const { confirmar } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm text-zinc-500">
            Gestão de Demandas Internas
          </p>
        </div>

        {confirmar === "1" && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Cadastro criado. Confirme o e-mail antes de entrar.
          </p>
        )}

        <FormularioLogin />

        <p className="text-sm text-zinc-500">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
