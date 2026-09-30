"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Pause, Play, Plus } from "lucide-react";
import { alternarAutomacaoAtivaAction } from "@/app/(app)/manychat/contas/[id]/actions";
import { rotulosGatilho, type Automacao } from "@/lib/manychat-automacoes";

export function ListaAutomacoes({ contaId, automacoes }: { contaId: string; automacoes: Automacao[] }) {
  const [automacoesOtimistas, definirAtivaOtimista] = useOptimistic(
    automacoes,
    (estado, payload: { id: string; active: boolean }) =>
      estado.map((a) => (a.id === payload.id ? { ...a, active: payload.active } : a)),
  );
  const [, iniciarTransicao] = useTransition();
  const [idPendente, setIdPendente] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function alternar(automacao: Automacao) {
    const novoAtivo = !automacao.active;
    setErro(null);
    setIdPendente(automacao.id);
    iniciarTransicao(async () => {
      definirAtivaOtimista({ id: automacao.id, active: novoAtivo });
      try {
        await alternarAutomacaoAtivaAction(contaId, automacao.id, novoAtivo);
      } catch {
        setErro("Não foi possível atualizar a automação. Tente de novo.");
      } finally {
        setIdPendente(null);
      }
    });
  }

  if (automacoesOtimistas.length === 0) {
    return (
      <div className="cartao flex flex-col items-center gap-3 px-5 py-14 text-center">
        <p className="text-sm font-medium">Nenhuma automação criada ainda</p>
        <p className="text-sm text-fg-tertiary">
          Crie a primeira pra responder comentários e DMs automaticamente.
        </p>
        <Link href={`/manychat/contas/${contaId}/automations/novo`} className="btn btn-primary btn-sm brilho-hover">
          <Plus className="h-3.5 w-3.5" />
          Criar automação
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <ul className="space-y-2">
        {automacoesOtimistas.map((automacao) => {
          const temPalavraChave = automacao.match_type === "any" || automacao.keywords?.length > 0;
          const temResposta = Boolean(automacao.dm_welcome_text || automacao.public_replies?.length > 0);
          const pendente = idPendente === automacao.id;

          return (
            <li key={automacao.id} className="cartao flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/manychat/contas/${contaId}/automations/${automacao.id}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {automacao.name}
                  </Link>
                  <span className={automacao.active ? "pill pill-green" : "pill pill-gray"}>
                    {automacao.active ? "Ativa" : "Pausada"}
                  </span>
                </div>
                <p className="truncate text-sm text-fg-tertiary">{rotulosGatilho(automacao)}</p>
                {automacao.keywords?.length > 0 && (
                  <p className="truncate text-sm text-fg-tertiary">
                    Palavras: {automacao.keywords.join(", ")}
                  </p>
                )}
                {!temPalavraChave || !temResposta ? (
                  <p className="mt-0.5 text-[11px] text-fg-tertiary">
                    {!temPalavraChave && "Sem palavra-chave configurada. "}
                    {!temResposta && "Sem resposta configurada."}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={pendente}
                onClick={() => alternar(automacao)}
                className="btn btn-secondary btn-sm shrink-0"
              >
                {pendente ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : automacao.active ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {automacao.active ? "Pausar" : "Ativar"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
