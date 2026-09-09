import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/perfil-consultas";
import { sair } from "@/app/auth/actions";
import { FormulariosOnboarding } from "./_componentes/formularios-onboarding";

export const metadata = { title: "Escolher escritório" };

export default async function PaginaOnboarding() {
  const perfil = await obterPerfil(); // exige sessão
  if (perfil.escritorioId) redirect("/dashboard");

  const primeiroNome = perfil.nome?.split(" ")[0];

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] bg-accent text-xs font-semibold text-accent-foreground">
            S
          </span>
          <span className="text-sm font-semibold">Secretária</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">
          {primeiroNome ? `Bem-vindo, ${primeiroNome}` : "Quase lá"}
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
