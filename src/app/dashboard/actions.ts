"use server";

import { revalidatePath } from "next/cache";
import { requererUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehDificuldade, ehStatus } from "@/lib/demandas";

export type EstadoDemanda = { erro: string } | { ok: true } | undefined;

/** Extrai e normaliza os campos do formulário de demanda. */
function lerCampos(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    dataEntrega: String(formData.get("data_entrega") ?? "").trim(),
    dificuldade: String(formData.get("dificuldade") ?? "").trim(),
  };
}

/**
 * Cria uma demanda para o usuário logado. Em sucesso, volta para `/dashboard`.
 */
export async function criarDemanda(
  _estadoAnterior: EstadoDemanda,
  formData: FormData,
): Promise<EstadoDemanda> {
  const usuario = await requererUsuario();
  const { titulo, descricao, dataEntrega, dificuldade } = lerCampos(formData);

  if (!titulo) return { erro: "Informe o título." };
  if (!ehDificuldade(dificuldade)) return { erro: "Dificuldade inválida." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("demandas").insert({
    usuario_id: usuario.id,
    titulo,
    descricao: descricao || null,
    data_entrega: dataEntrega || null,
    dificuldade,
  });

  if (error) return { erro: error.message };

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
  await requererUsuario();
  const id = String(formData.get("id") ?? "");
  const { titulo, descricao, dataEntrega, dificuldade } = lerCampos(formData);

  if (!id) return { erro: "Demanda não identificada." };
  if (!titulo) return { erro: "Informe o título." };
  if (!ehDificuldade(dificuldade)) return { erro: "Dificuldade inválida." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("demandas")
    .update({
      titulo,
      descricao: descricao || null,
      data_entrega: dataEntrega || null,
      dificuldade,
    })
    .eq("id", id);

  if (error) return { erro: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Troca o status de uma demanda (pendente / em_andamento / concluida).
 * Usada pelos botões da listagem. Dono ou chefe — a RLS decide.
 */
export async function definirStatusDemanda(formData: FormData) {
  await requererUsuario();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !ehStatus(status)) return;

  const supabase = await criarClienteServidor();
  await supabase.from("demandas").update({ status }).eq("id", id);

  revalidatePath("/dashboard");
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

  await supabase.from("comentarios").insert({
    demanda_id: demandaId,
    usuario_id: usuario.id,
    texto,
    autor_nome: (perfil?.nome as string | null) ?? null,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${demandaId}/editar`);
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
