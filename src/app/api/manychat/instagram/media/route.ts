import { NextRequest, NextResponse } from "next/server";
import { requererUsuario } from "@/lib/auth";
import { obterConta } from "@/lib/manychat-contas-consultas";
import { getMedia } from "@/lib/manychat/instagram";

// Usado pelo seletor visual de posts no formulário de automação. Exige
// sessão + a conta pertencer ao escritório do usuário (obterConta já é
// escopado por RLS — se for de outro escritório, simplesmente não acha).
export async function GET(request: NextRequest) {
  await requererUsuario();

  const contaId = request.nextUrl.searchParams.get("contaId");
  if (!contaId) {
    return NextResponse.json({ error: "contaId é obrigatório" }, { status: 400 });
  }

  const conta = await obterConta(contaId);
  if (!conta?.access_token || !conta.ig_user_id) {
    return NextResponse.json({ error: "Instagram não conectado" }, { status: 400 });
  }

  try {
    const media = await getMedia(conta.ig_user_id, conta.access_token);
    return NextResponse.json(media);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
