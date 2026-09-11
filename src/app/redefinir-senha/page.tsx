import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Marca } from "@/app/_componentes/marca";
import { FormularioRedefinirSenha } from "./formulario-redefinir-senha";

export const metadata = { title: "Redefinir senha" };

export default async function PaginaRedefinirSenha() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="tela-auth flex flex-1 items-center justify-center p-6">
      <div className="cartao-auth w-full max-w-sm p-8">
        <div className="mb-7">
          <Marca />
        </div>

        <h1 className="font-display text-2xl tracking-wide text-foreground">
          REDEFINIR SENHA
        </h1>

        {user ? (
          <>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Escolha a nova senha da sua conta.
            </p>
            <div className="mt-6">
              <FormularioRedefinirSenha />
            </div>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Esse link de redefinição é inválido ou expirou.
            </p>
            <p className="mt-6 text-sm text-fg-secondary">
              <Link
                href="/esqueci-senha"
                className="font-medium text-accent hover:underline"
              >
                Solicitar um novo link
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
