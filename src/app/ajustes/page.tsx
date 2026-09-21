import { ExternalLink, LifeBuoy } from "lucide-react";
import { CascaApp } from "@/app/_componentes/casca-app";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { obterConfigWhatsapp } from "@/lib/whatsapp-consultas";
import { ehAdmin } from "@/lib/admin";
import { PreferenciaWhatsapp } from "./_componentes/preferencia-whatsapp";
import { IntegracaoWhatsapp } from "./_componentes/integracao-whatsapp";
import { EscolherFundo } from "./_componentes/escolher-fundo";

export const metadata = { title: "Ajustes" };

// ref do projeto Supabase — usado no link de reativação (só admin).
const SUPABASE_PROJECT_REF = "fzxxlhqubtlgmrocmoxa";

export default async function PaginaAjustes() {
  const perfil = await requererEscritorio();
  const chefe = perfil.papel === "chefe";
  const admin = ehAdmin(perfil.email);

  const config = chefe ? await obterConfigWhatsapp() : null;

  return (
    <CascaApp>
      <main className="mx-auto w-full max-w-2xl px-6 py-8 md:px-10">
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>

        {admin && (
          <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-fg-secondary" />
              <h2 className="text-sm font-semibold">Reativar sistema</h2>
            </div>
            <p className="mt-1.5 text-sm text-fg-secondary">
              O banco de dados (Supabase, plano grátis) pode ser pausado após 7
              dias sem uso. Um robô acessa o site a cada 2 dias pra evitar isso,
              mas se mesmo assim o sistema sair do ar, reative o projeto aqui.
            </p>
            <a
              href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm mt-3"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir painel do Supabase
            </a>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold">Aparência</h2>
          <p className="mt-1 text-sm text-fg-secondary">
            Escolha o fundo de tela do seu Nitro. Só você vê essa escolha.
          </p>
          <div className="mt-4">
            <EscolherFundo atual={perfil.imagemFundo} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold">WhatsApp</h2>
          <p className="mt-1 text-sm text-fg-secondary">
            Avisos de demandas no seu WhatsApp.
          </p>

          <div className="mt-4 rounded-[var(--radius)] border border-border bg-surface p-4">
            <h3 className="text-sm font-medium">Seu WhatsApp</h3>
            <PreferenciaWhatsapp
              telefone={perfil.telefone}
              whatsappAtivo={perfil.whatsappAtivo}
            />
          </div>

          {chefe && (
            <div className="mt-4 rounded-[var(--radius)] border border-border bg-surface p-4">
              <h3 className="text-sm font-medium">Integração do escritório</h3>
              <p className="mt-1 text-xs text-fg-tertiary">
                Conecte o gateway de WhatsApp (ex.: Nandu) que vai entregar as
                mensagens. Vale para todos deste escritório.
              </p>
              <IntegracaoWhatsapp config={config} />
            </div>
          )}
        </section>
      </main>
    </CascaApp>
  );
}
