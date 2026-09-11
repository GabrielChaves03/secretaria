import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/perfil-consultas";
import { sair } from "@/app/auth/actions";
import { Marca } from "@/app/_componentes/marca";
import { FormulariosOnboarding } from "./_componentes/formularios-onboarding";

export const metadata = { title: "Escolher escritório" };

export default async function PaginaOnboarding() {
  const perfil = await obterPerfil(); // exige sessão
  if (perfil.escritorioId) redirect("/dashboard");

  const primeiroNome = perfil.nome?.split(" ")[0];

  return (
    <div className="tela-auth flex flex-1 items-center justify-center p-6">
      <div className="cartao-auth w-full max-w-md p-8">
        <div className="mb-7">
          <Marca />
        </div>

        <h1 className="font-display text-2xl tracking-wide text-foreground">
          {primeiroNome ? `BEM-VINDO, ${primeiroNome.toUpperCase()}` : "QUASE LÁ"}
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Crie o escritório da sua empresa ou entre num que já existe com o
          código.
        </p>

        <div className="mt-6">
          <FormulariosOnboarding />
        </div>

        <form action={sair} className="mt-6">
          <button
            type="submit"
            className="text-sm text-fg-tertiary transition-colors hover:text-foreground"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
