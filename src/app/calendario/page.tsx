import Link from "next/link";
import { CalendarioCliente } from "./_componentes/calendario-cliente";
import type { EventoDemanda } from "./_componentes/calendario-demandas";
import { obterPerfil } from "@/lib/perfil-consultas";
import { listarDemandas } from "@/lib/demandas-consultas";
import { ROTULO_DIFICULDADE } from "@/lib/demandas";

export const metadata = { title: "Calendário" };

export default async function PaginaCalendario() {
  await obterPerfil(); // exige sessão; redireciona pro /login se não houver

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
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <Link href="/dashboard" className="text-sm text-zinc-500 underline">
        ← Voltar ao painel
      </Link>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Calendário</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Demandas posicionadas pela data de entrega. Clique numa para editar.
      </p>

      <ul className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#16a34a]" />
          {ROTULO_DIFICULDADE.facil}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#ca8a04]" />
          {ROTULO_DIFICULDADE.media}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#dc2626]" />
          {ROTULO_DIFICULDADE.dificil}
        </li>
      </ul>

      <div className="mt-6">
        <CalendarioCliente eventos={eventos} />
      </div>
    </main>
  );
}
