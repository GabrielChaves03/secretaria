import { CalendarioCliente } from "./_componentes/calendario-cliente";
import { BotaoNovoCompromisso } from "./_componentes/botao-novo-compromisso";
import type { EventoDemanda } from "./_componentes/calendario-demandas";
import { requererEscritorio } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { listarCompromissos } from "@/lib/compromissos-consultas";
import { PILL_DIFICULDADE, ROTULO_DIFICULDADE } from "@/lib/demandas";

export const metadata = { title: "Calendário" };

export default async function PaginaCalendario() {
  await requererEscritorio(); // exige sessão + escritório (senão vai pro /onboarding)

  const [demandas, compromissos] = await Promise.all([
    listarDemandas(),
    listarCompromissos(),
  ]);

  const eventos: EventoDemanda[] = demandas
    .filter((d) => d.data_entrega)
    .map((d) => ({
      id: d.id,
      titulo: d.titulo,
      data_entrega: d.data_entrega as string,
      dificuldade: d.dificuldade,
    }));

  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 md:px-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
            <p className="mt-0.5 text-sm text-fg-secondary">
              Demandas pela data de entrega e seus compromissos. Clique num item pra abrir.
            </p>
          </div>
          <BotaoNovoCompromisso />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["facil", "media", "dificil"] as const).map((d) => (
            <span key={d} className={PILL_DIFICULDADE[d]}>
              {ROTULO_DIFICULDADE[d]}
            </span>
          ))}
          <span className="pill pill-blue">Compromisso</span>
        </div>

        <div className="cartao-calendario mt-6">
          <CalendarioCliente eventos={eventos} compromissos={compromissos} />
        </div>
      </main>
    </>
  );
}
