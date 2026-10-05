"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DIFICULDADES, PRIORIDADES, ROTULO_DIFICULDADE, type Demanda } from "@/lib/demandas";
import type { EstadoDemanda } from "@/app/(app)/dashboard/actions";
import type { Membro } from "@/lib/escritorios";

type Props = {
  acao: (
    estado: EstadoDemanda,
    formData: FormData,
  ) => Promise<EstadoDemanda>;
  /** Quando presente, o formulário edita esta demanda em vez de criar. */
  demanda?: Demanda;
  rotuloEnvio: string;
  /**
   * Chamado ao salvar com sucesso. Se informado (contexto de modal), o
   * formulário não navega — deixa o pai fechar/atualizar. Se ausente, o
   * formulário volta para /dashboard.
   */
  aoConcluir?: () => void;
  /**
   * Membros do escritório — só passado para o chefe. Quando presente, mostra
   * o seletor "Responsável" (atribuir a demanda a outra pessoa).
   */
  membros?: Pick<Membro, "id" | "nome">[];
  /** Usuário logado — marcado como "(você)" e responsável padrão ao criar. */
  usuarioId?: string;
  /** Responsável pré-selecionado ao criar (sobrepõe `usuarioId`). */
  responsavelPadrao?: string;
  /** Quadro onde a demanda será criada (vai num input oculto). */
  quadroId?: string;
  /** Status configurados do escritório (para o seletor de status). */
  statuses?: string[];
  /** Grupo (seção do quadro) onde criar — vai num input oculto. */
  grupo?: string;
};

export function FormularioDemanda({
  acao,
  demanda,
  rotuloEnvio,
  aoConcluir,
  membros,
  usuarioId,
  responsavelPadrao,
  quadroId,
  statuses,
  grupo,
}: Props) {
  const router = useRouter();
  const [estado, acaoForm, pendente] = useActionState<EstadoDemanda, FormData>(
    acao,
    undefined,
  );

  const sucesso = !!estado && "ok" in estado && estado.ok;

  useEffect(() => {
    if (!sucesso) return;
    if (aoConcluir) aoConcluir();
    else router.push("/dashboard");
  }, [sucesso, aoConcluir, router]);

  return (
    <form action={acaoForm} className="space-y-5">
      {demanda && <input type="hidden" name="id" value={demanda.id} />}
      {quadroId && <input type="hidden" name="quadro_id" value={quadroId} />}
      {grupo && <input type="hidden" name="grupo" value={grupo} />}

      <div className="space-y-1.5">
        <label htmlFor="titulo" className="rotulo block">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          autoFocus
          defaultValue={demanda?.titulo ?? ""}
          className="campo"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="descricao" className="rotulo block">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          defaultValue={demanda?.descricao ?? ""}
          className="campo resize-y"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="data_entrega" className="rotulo block">
            Data de entrega
          </label>
          <input
            id="data_entrega"
            name="data_entrega"
            type="date"
            defaultValue={demanda?.data_entrega ?? ""}
            className="campo"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dificuldade" className="rotulo block">
            Dificuldade
          </label>
          <select
            id="dificuldade"
            name="dificuldade"
            defaultValue={demanda?.dificuldade ?? "media"}
            className="campo"
          >
            {DIFICULDADES.map((d) => (
              <option key={d} value={d}>
                {ROTULO_DIFICULDADE[d]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {statuses && statuses.length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="status" className="rotulo block">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={demanda?.status ?? statuses[0]}
              className="campo"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="prioridade" className="rotulo block">
            Prioridade
          </label>
          <select
            id="prioridade"
            name="prioridade"
            defaultValue={demanda?.prioridade ?? ""}
            className="campo"
          >
            <option value="">—</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="link" className="rotulo block">
          Link
        </label>
        <input
          id="link"
          name="link"
          type="url"
          defaultValue={demanda?.link ?? ""}
          placeholder="https://..."
          className="campo"
        />
      </div>

      {membros && membros.length > 1 && (
        <div className="space-y-1.5">
          <label htmlFor="responsavel_id" className="rotulo block">
            Responsável
          </label>
          <select
            id="responsavel_id"
            name="responsavel_id"
            defaultValue={demanda?.usuario_id ?? responsavelPadrao ?? usuarioId ?? ""}
            className="campo"
          >
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome ?? "Sem nome"}
                {m.id === usuarioId ? " (você)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-fg-tertiary">
            O responsável é avisado no app e no WhatsApp.
          </p>
        </div>
      )}

      {estado && "erro" in estado && (
        <p className="text-sm text-danger">{estado.erro}</p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="btn btn-primary">
          {pendente ? "Salvando..." : rotuloEnvio}
        </button>
        {aoConcluir ? (
          <button
            type="button"
            onClick={aoConcluir}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
        ) : (
          <Link href="/dashboard" className="btn btn-secondary">
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
