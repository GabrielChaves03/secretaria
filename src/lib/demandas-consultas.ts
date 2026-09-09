import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { Demanda, DemandaComDono, Status } from "@/lib/demandas";

/**
 * Lista as demandas visíveis para o usuário logado, da mais recente para a
 * mais antiga. A RLS decide o recorte: funcionário vê só as suas, chefe vê
 * todas. `status` é o filtro opcional da UI e `busca` é o termo da barra de
 * pesquisa (casa com título ou descrição, sem diferenciar maiúsculas).
 *
 * Também resolve o nome do dono de cada demanda (uma consulta extra a
 * `usuarios`) — relevante na visão do chefe.
 */
export async function listarDemandas(
  status?: Status,
  busca?: string,
): Promise<DemandaComDono[]> {
  const supabase = await criarClienteServidor();

  let consulta = supabase
    .from("demandas")
    .select("*")
    .order("criado_em", { ascending: false });

  if (status) {
    consulta = consulta.eq("status", status);
  }

  // Remove os caracteres que quebram a sintaxe do `.or()` do PostgREST.
  const termo = busca?.replace(/[%,()*]/g, " ").trim();
  if (termo) {
    consulta = consulta.or(
      `titulo.ilike.%${termo}%,descricao.ilike.%${termo}%`,
    );
  }

  const { data, error } = await consulta;
  if (error) throw error;

  const demandas = (data ?? []) as Demanda[];
  if (demandas.length === 0) return [];

  const ids = [...new Set(demandas.map((d) => d.usuario_id))];
  const { data: donos } = await supabase
    .from("usuarios")
    .select("id, nome")
    .in("id", ids);

  const nomePorId = new Map<string, string | null>(
    (donos ?? []).map((u) => [
      u.id as string,
      (u.nome as string | null) ?? null,
    ]),
  );

  return demandas.map((d) => ({
    ...d,
    dono_nome: nomePorId.get(d.usuario_id) ?? null,
  }));
}

/**
 * Busca uma demanda pelo id. Retorna `null` quando não existe — ou quando o
 * usuário não tem acesso (a RLS filtra e a query volta vazia).
 */
export async function obterDemanda(id: string): Promise<Demanda | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("demandas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return (data as Demanda | null) ?? null;
}
