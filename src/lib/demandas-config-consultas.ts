import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import {
  CONFIG_PADRAO,
  type ColunaDemanda,
  type ConfigDemandas,
} from "@/lib/demandas-config";

export type { ConfigDemandas, ColunaDemanda } from "@/lib/demandas-config";

/**
 * Config de demandas do escritório logado (statuses, cores, colunas). A RLS
 * só devolve a do próprio escritório; sem linha ainda, cai no padrão do Avant.
 */
export async function obterConfigDemandas(): Promise<ConfigDemandas> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("escritorio_demandas_config")
    .select("statuses, status_cores, colunas, show_summary")
    .maybeSingle();

  if (!data) return CONFIG_PADRAO;

  return {
    statuses: (data.statuses as string[] | null) ?? CONFIG_PADRAO.statuses,
    statusCores:
      (data.status_cores as Record<string, string> | null) ??
      CONFIG_PADRAO.statusCores,
    colunas: (data.colunas as ColunaDemanda[] | null) ?? CONFIG_PADRAO.colunas,
    showSummary: data.show_summary !== false,
  };
}
