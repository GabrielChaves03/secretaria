import Link from "next/link";
import { FormularioLogin } from "./formulario-login";

export const metadata = { title: "Entrar" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ confirmar?: string; erro?: string }>;
}) {
  const { confirmar, erro } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] bg-accent text-xs font-semibold text-accent-foreground">
            S
          </span>
          <span className="text-sm font-semibold">Secretária</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-fg-secondary">
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
