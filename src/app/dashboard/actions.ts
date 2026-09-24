"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehDificuldade, ehStatus, ROTULO_STATUS, type Status } from "@/lib/demandas";
import { avisarDono } from "@/lib/whatsapp-envio";
import { formatarDiaMes } from "@/lib/whatsapp";

export type EstadoDemanda = { erro: string } | { ok: true } | undefined;

/** Extrai e normaliza os campos do formulário de demanda. */
function lerCampos(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    dataEntrega: String(formData.get("data_entrega") ?? "").trim(),
    dificuldade: String(formData.get("dificuldade") ?? "").trim(),
    /** Só vem no formulário do chefe; vazio = não mexe no responsável. */
    responsavelId: String(formData.get("responsavel_id") ?? "").trim(),
  };
}

/** Corpo do aviso de WhatsApp de demanda atribuída. */
function corpoAtribuicao(titulo: string, dataEntrega: string, descricao: string) {
  const linhas = [`📌 Você tem uma nova demanda: *${titulo}*`];
  if (dataEntrega) linhas.push(`Prazo: ${formatarDiaMes(dataEntrega)}`);
  if (descricao) {
    linhas.push(descricao.length > 280 ? `${descricao.slice(0, 280)}…` : descricao);
  }
  return linhas.join("\n");
}

/**
 * Cria uma demanda. Por padrão é do usuário logado; o chefe pode escolher
 * outro membro como responsável (`responsavel_id` — a RLS só aceita membro
 * do mesmo escritório), e aí o responsável é avisado.
 */
export async function criarDemanda(
  _estadoAnterior: EstadoDemanda,
  formData: FormData,
): Promise<EstadoDemanda> {
  const usuario = await requererUsuario();
  const { titulo, descricao, dataEntrega, dificuldade, responsavelId } =
    lerCampos(formData);

  if (!titulo) return { erro: "Informe o título." };
  if (!ehDificuldade(dificuldade)) return { erro: "Dificuldade inválida." };

  const donoId = responsavelId || usuario.id;

  const supabase = await criarClienteServidor();
  const { data: criada, error } = await supabase
    .from("demandas")
    .insert({
      usuario_id: donoId,
      titulo,
      descricao: descricao || null,
      data_entrega: dataEntrega || null,
      dificuldade,
    })
    .select("id")
    .single();

  if (error) return { erro: error.message };

  if (donoId !== usuario.id) {
    await avisarDono({
      donoId,
      tipo: "atribuicao",
      corpo: corpoAtribuicao(titulo, dataEntrega, descricao),
      demandaId: criada.id as string,
    });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Atualiza os dados de uma demanda. Quem pode editar (dono ou chefe) é
 * decidido pela RLS — por isso não filtramos por `usuario_id` aqui.
 */
export async function atualizarDemanda(
  _estadoAnterior: EstadoDemanda,
  formData: FormData,
): Promise<EstadoDemanda> {
  const usuario = await requererUsuario();
  const id = String(formData.get("id") ?? "");
  const { titulo, descricao, dataEntrega, dificuldade, responsavelId } =
    lerCampos(formData);

  if (!id) return { erro: "Demanda não identificada." };
  if (!titulo) return { erro: "Informe o título." };
  if (!ehDificuldade(dificuldade)) return { erro: "Dificuldade inválida." };

  const supabase = await criarClienteServidor();

  const { data: antes } = await supabase
    .from("demandas")
    .select("usuario_id")
    .eq("id", id)
    .maybeSingle();
  const donoAnterior = antes?.usuario_id as string | undefined;

  const { data: demanda, error } = await supabase
    .from("demandas")
    .update({
      titulo,
      descricao: descricao || null,
      data_entrega: dataEntrega || null,
      dificuldade,
      ...(responsavelId ? { usuario_id: responsavelId } : {}),
    })
    .eq("id", id)
    .select("usuario_id")
    .maybeSingle();

  if (error) return { erro: error.message };

  const donoId = demanda?.usuario_id as string | undefined;
  if (donoId && donoId !== usuario.id) {
    const reatribuida = donoId !== donoAnterior;
    await avisarDono({
      donoId,
      tipo: reatribuida ? "atribuicao" : "status",
      corpo: reatribuida
        ? corpoAtribuicao(titulo, dataEntrega, descricao)
        : `✏️ A demanda *${titulo}* foi atualizada.`,
      demandaId: id,
    });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Troca o status de uma demanda (pendente / em_andamento / concluida).
 * Usada pelos botões da listagem. Dono ou chefe — a RLS decide.
 */
export async function definirStatusDemanda(formData: FormData) {
  const usuario = await requererUsuario();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !ehStatus(status)) return;

  const supabase = await criarClienteServidor();
  const { data: demanda } = await supabase
    .from("demandas")
    .update({ status })
    .eq("id", id)
    .select("usuario_id, titulo")
    .maybeSingle();

  await avisarMudancaStatus(demanda, id, status, usuario.id);

  revalidatePath("/dashboard");
}

/** Aviso de WhatsApp de troca de status, se quem mudou não é o dono. */
async function avisarMudancaStatus(
  demanda: { usuario_id: unknown; titulo: unknown } | null,
  id: string,
  status: Status,
  atorId: string,
) {
  const donoId = demanda?.usuario_id as string | undefined;
  if (!donoId || donoId === atorId) return;
  await avisarDono({
    donoId,
    tipo: "status",
    corpo: `🔄 A demanda *${demanda?.titulo}* agora está *${ROTULO_STATUS[status]}*.`,
    demandaId: id,
  });
}

/**
 * Apaga uma demanda. Dono ou chefe — a RLS decide (migration 0007).
 */
export async function apagarDemanda(formData: FormData) {
  await requererUsuario();
  const id = String(formData.get("id") ?? "");

  if (!id) return;

  const supabase = await criarClienteServidor();
  await supabase.from("demandas").delete().eq("id", id);

  revalidatePath("/dashboard");
}

/**
 * Adiciona um comentário a uma demanda. A RLS garante que só o dono da
 * demanda ou um chefe conseguem inserir. Guarda o nome do autor junto para
 * a listagem e para o texto da notificação.
 */
export async function adicionarComentario(formData: FormData) {
  const usuario = await requererUsuario();
  const demandaId = String(formData.get("demanda_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();

  if (!demandaId || !texto) return;

  const supabase = await criarClienteServidor();

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nome")
    .eq("id", usuario.id)
    .maybeSingle();
  const autorNome = (perfil?.nome as string | null) ?? "Alguém";

  await supabase.from("comentarios").insert({
    demanda_id: demandaId,
    usuario_id: usuario.id,
    texto,
    autor_nome: (perfil?.nome as string | null) ?? null,
  });

  const { data: demanda } = await supabase
    .from("demandas")
    .select("usuario_id, titulo")
    .eq("id", demandaId)
    .maybeSingle();
  const donoId = demanda?.usuario_id as string | undefined;
  if (donoId && donoId !== usuario.id) {
    const trecho = texto.length > 300 ? `${texto.slice(0, 300)}…` : texto;
    await avisarDono({
      donoId,
      tipo: "comentario",
      corpo: `💬 ${autorNome} comentou em *${demanda?.titulo}*:\n"${trecho}"`,
      demandaId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${demandaId}/editar`);
}

/**
 * Cria uma lista personalizada do quadro para o usuário logado.
 */
export async function criarLista(formData: FormData) {
  const usuario = await requererUsuario();
  const nome = String(formData.get("nome") ?? "").trim();

  if (!nome) return;

  const supabase = await criarClienteServidor();
  await supabase.from("listas").insert({ usuario_id: usuario.id, nome });

  revalidatePath("/dashboard");
}

/**
 * Renomeia uma lista. Dono ou chefe — a RLS decide.
 */
export async function renomearLista(formData: FormData) {
  await requererUsuario();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();

  if (!id || !nome) return;

  const supabase = await criarClienteServidor();
  await supabase.from("listas").update({ nome }).eq("id", id);

  revalidatePath("/dashboard");
}

/**
 * Apaga uma lista. Os cards dela voltam para o fluxo automático
 * (demandas.lista_id vira null via ON DELETE SET NULL). Dono ou chefe.
 */
export async function apagarLista(formData: FormData) {
  await requererUsuario();
  const id = String(formData.get("id") ?? "");

  if (!id) return;

  const supabase = await criarClienteServidor();
  await supabase.from("listas").delete().eq("id", id);

  revalidatePath("/dashboard");
}

/**
 * Move uma demanda entre colunas do quadro:
 * - `"status:<pendente|em_andamento|concluida>"` → troca o status e tira de
 *   qualquer lista (volta pras 3 colunas automáticas);
 * - `"lista:<uuid>"` → coloca na lista indicada, sem mexer no status.
 */
export async function moverDemanda(id: string, destino: string) {
  const usuario = await requererUsuario();
  if (!id || !destino) return;

  const supabase = await criarClienteServidor();

  if (destino.startsWith("lista:")) {
    const listaId = destino.slice("lista:".length);
    if (!listaId) return;
    await supabase.from("demandas").update({ lista_id: listaId }).eq("id", id);
  } else if (destino.startsWith("status:")) {
    const status = destino.slice("status:".length);
    if (!ehStatus(status)) return;
    const { data: antes } = await supabase
      .from("demandas")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    const { data: demanda } = await supabase
      .from("demandas")
      .update({ status, lista_id: null })
      .eq("id", id)
      .select("usuario_id, titulo")
      .maybeSingle();
    if (antes?.status !== status) {
      await avisarMudancaStatus(demanda, id, status, usuario.id);
    }
  } else {
    return;
  }

  revalidatePath("/dashboard");
}

/**
 * Marca todas as notificações não lidas do usuário logado como lidas.
 * Chamada ao abrir a página de notificações.
 */
export async function marcarNotificacoesLidas() {
  const usuario = await requererUsuario();

  const supabase = await criarClienteServidor();
  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("usuario_id", usuario.id)
    .eq("lida", false);

  revalidatePath("/dashboard", "layout");
}
