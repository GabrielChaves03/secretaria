import Link from "next/link";
import { Marca } from "@/app/_componentes/marca";
import { FormularioLogin } from "./formulario-login";

export const metadata = { title: "Entrar" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ confirmar?: string; erro?: string }>;
}) {
  const { confirmar, erro } = await searchParams;

  return (
    <div className="tela-auth flex flex-1 items-center justify-center p-6">
      <div className="cartao-auth w-full max-w-sm p-8">
        <div className="mb-7">
          <Marca />
        </div>

        <h1 className="font-display text-3xl tracking-wide text-foreground">
          ENTRAR
        </h1>
        <p className="mt-1.5 text-sm text-fg-secondary">
          Gestão de Demandas Internas
        </p>

        {confirmar === "1" && (
          <p className="mt-4 rounded-[var(--radius-sm)] bg-accent-subtle-bg px-3 py-2 text-sm text-accent-subtle-fg">
            Cadastro criado. Confirme o e-mail antes de entrar.
          </p>
        )}

        {erro === "link_invalido" && (
          <p className="mt-4 text-sm text-danger">
            O link usado é inválido ou expirou. Solicite um novo em
            &quot;Esqueci minha senha&quot;.
          </p>
        )}

        <div className="mt-6">
          <FormularioLogin />
        </div>

        <p className="mt-3 text-sm text-fg-secondary">
          <Link
            href="/esqueci-senha"
            className="font-medium text-accent hover:underline"
          >
            Esqueci minha senha
          </Link>
        </p>

        <p className="mt-6 text-sm text-fg-secondary">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-accent hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
