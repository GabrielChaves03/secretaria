import Link from "next/link";
import { Marca } from "@/app/_componentes/marca";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata = { title: "Cadastro" };

export default function PaginaCadastro() {
  return (
    <div className="tela-auth flex flex-1 items-center justify-center p-6">
      <div className="cartao-auth w-full max-w-sm p-8">
        <div className="mb-7">
          <Marca />
        </div>

        <h1 className="font-display text-3xl tracking-wide text-foreground">
          CRIAR CONTA
        </h1>
        <p className="mt-1.5 text-sm text-fg-secondary">
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
