import Link from "next/link";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata = { title: "Cadastro" };

export default function PaginaCadastro() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] bg-accent text-xs font-semibold text-accent-foreground">
            S
          </span>
          <span className="text-sm font-semibold">Secretária</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Gestão de Demandas Internas
        </p>

        <div className="mt-6">
          <FormularioCadastro />
        </div>

        <p className="mt-6 text-sm text-fg-secondary">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
