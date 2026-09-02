import Link from "next/link";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata = { title: "Cadastro" };

export default function PaginaCadastro() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-zinc-500">Gestão de Demandas Internas</p>
        </div>

        <FormularioCadastro />

        <p className="text-sm text-zinc-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
