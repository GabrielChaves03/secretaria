import Link from "next/link";
import { FormularioEsqueciSenha } from "./formulario-esqueci-senha";

export const metadata = { title: "Esqueci minha senha" };

export default async function PaginaEsqueciSenha({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] bg-accent text-xs font-semibold text-accent-foreground">
            S
          </span>
          <span className="text-sm font-semibold">Secretária</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">
          Esqueci minha senha
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Informe seu e-mail e enviaremos um link pra redefinir a senha.
        </p>

        {enviado === "1" ? (
          <p className="mt-6 rounded-[var(--radius-sm)] bg-accent-subtle-bg px-3 py-2 text-sm text-accent-subtle-fg">
            Se esse e-mail tiver uma conta, enviamos um link de redefinição.
            Confira também a caixa de spam.
          </p>
        ) : (
          <div className="mt-6">
            <FormularioEsqueciSenha />
          </div>
        )}

        <p className="mt-6 text-sm text-fg-secondary">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
