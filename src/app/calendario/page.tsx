import { CascaApp } from "@/app/_componentes/casca-app";
import { CalendarioCliente } from "./_componentes/calendario-cliente";
import type { EventoDemanda } from "./_componentes/calendario-demandas";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { PILL_DIFICULDADE, ROTULO_DIFICULDADE } from "@/lib/demandas";

export const metadata = { title: "Calendário" };

export default async function PaginaCalendario() {
  await requererEscritorio(); // exige sessão + escritório (senão vai pro /onboarding)

  const demandas = await listarDemandas();
  const eventos: EventoDemanda[] = demandas
    .filter((d) => d.data_entrega)
    .map((d) => ({
      id: d.id,
      titulo: d.titulo,
      data_entrega: d.data_entrega as string,
      dificuldade: d.dificuldade,
    }));

  return (
    <CascaApp>
      <main className="mx-auto w-full max-w-3xl px-6 py-8 md:px-10">
        <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
        <p className="mt-0.5 text-sm text-fg-secondary">
          Demandas pela data de entrega. Clique numa para editar.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["facil", "media", "dificil"] as const).map((d) => (
            <span key={d} className={PILL_DIFICULDADE[d]}>
              {ROTULO_DIFICULDADE[d]}
            </span>
          ))}
        </div>

        <div className="mt-6">
          <CalendarioCliente eventos={eventos} />
        </div>
      </main>
    </CascaApp>
  );
}
