import Link from "next/link";
import { Marca } from "@/app/_componentes/marca";
import { FormularioEsqueciSenha } from "./formulario-esqueci-senha";

export const metadata = { title: "Esqueci minha senha" };

export default async function PaginaEsqueciSenha({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;

  return (
    <div className="tela-auth flex flex-1 items-center justify-center p-6">
      <div className="cartao-auth w-full max-w-sm p-8">
        <div className="mb-7">
          <Marca />
        </div>

        <h1 className="font-display text-2xl tracking-wide text-foreground">
          ESQUECI MINHA SENHA
        </h1>
        <p className="mt-1.5 text-sm text-fg-secondary">
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
