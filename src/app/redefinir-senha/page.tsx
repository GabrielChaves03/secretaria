import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioRedefinirSenha } from "./formulario-redefinir-senha";

export const metadata = { title: "Redefinir senha" };

export default async function PaginaRedefinirSenha() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          Redefinir senha
        </h1>

        {user ? (
          <>
            <p className="mt-1 text-sm text-fg-secondary">
              Escolha a nova senha da sua conta.
            </p>
            <div className="mt-6">
              <FormularioRedefinirSenha />
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-fg-secondary">
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
