"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { SeletorMidia } from "./seletor-midia";
import type { EstadoAutomacao } from "@/app/manychat/contas/[id]/actions";
import { TIPOS_CORRESPONDENCIA, ROTULO_CORRESPONDENCIA, type Automacao } from "@/lib/manychat-automacoes";

type Props = {
  contaId: string;
  acao: (estado: EstadoAutomacao, formData: FormData) => Promise<EstadoAutomacao>;
  /** Quando presente, o formulário edita esta automação em vez de criar. */
  automacao?: Automacao;
  rotuloEnvio: string;
};

export function FormularioAutomacao({ contaId, acao, automacao, rotuloEnvio }: Props) {
  const [estado, acaoForm, pendente] = useActionState<EstadoAutomacao, FormData>(acao, undefined);
  const [matchType, setMatchType] = useState(automacao?.match_type ?? "contains");

  return (
    <form action={acaoForm} className="space-y-6">
      {estado?.erro && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {estado.erro}
        </div>
      )}

      <section className="cartao space-y-4 px-4 py-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="rotulo block">
            Nome da automação
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoFocus
            defaultValue={automacao?.name}
            placeholder="Ex.: Promoção Reels Agosto"
            className="campo"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={automacao?.active ?? true}
            className="h-4 w-4 accent-accent"
          />
          Automação ativa
        </label>
      </section>

      <section className="cartao space-y-3 px-4 py-4">
        <div>
          <h3 className="text-sm font-semibold">Gatilhos</h3>
          <p className="text-xs text-fg-tertiary">Quando essa automação deve disparar?</p>
        </div>
        <Checkbox id="trigger_comment" label="Comentário em post/reels" defaultChecked={automacao?.trigger_comment ?? true} />
        <Checkbox id="trigger_story_reply" label="Resposta a story" defaultChecked={automacao?.trigger_story_reply ?? false} />
        <Checkbox id="trigger_dm" label="DM direta" defaultChecked={automacao?.trigger_dm ?? false} />
      </section>

      <section className="cartao space-y-4 px-4 py-4">
        <h3 className="text-sm font-semibold">Palavras-chave</h3>
        <div className="space-y-1.5">
          <label htmlFor="keywords" className="rotulo block">
            Uma por linha
          </label>
          <textarea
            id="keywords"
            name="keywords"
            rows={3}
            defaultValue={automacao?.keywords?.join("\n")}
            placeholder={"quero\nlink\neu quero"}
            className="campo resize-y"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="match_type" className="rotulo block">
            Tipo de correspondência
          </label>
          <select
            id="match_type"
            name="match_type"
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as typeof matchType)}
            className="campo"
          >
            {TIPOS_CORRESPONDENCIA.map((t) => (
              <option key={t} value={t}>
                {ROTULO_CORRESPONDENCIA[t]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="cartao px-4 py-4">
        <h3 className="mb-3 text-sm font-semibold">Post específico (opcional)</h3>
        <SeletorMidia
          contaId={contaId}
          midiaIdInicial={automacao?.target_media_id}
          permalinkInicial={automacao?.target_media_permalink}
          thumbnailInicial={automacao?.target_media_thumbnail_url}
        />
      </section>

      <section className="cartao space-y-1.5 px-4 py-4">
        <h3 className="text-sm font-semibold">Resposta pública no comentário (opcional)</h3>
        <label htmlFor="public_replies" className="rotulo block">
          Variações (uma por linha, sorteia uma para responder)
        </label>
        <textarea
          id="public_replies"
          name="public_replies"
          rows={3}
          defaultValue={automacao?.public_replies?.join("\n")}
          placeholder={"Te chamei no DM! 😉\nManda ver no direct!"}
          className="campo resize-y"
        />
      </section>

      <section className="cartao space-y-4 px-4 py-4">
        <h3 className="text-sm font-semibold">DM de boas-vindas</h3>
        <div className="space-y-1.5">
          <label htmlFor="dm_welcome_text" className="rotulo block">
            Mensagem
          </label>
          <textarea
            id="dm_welcome_text"
            name="dm_welcome_text"
            rows={3}
            defaultValue={automacao?.dm_welcome_text ?? ""}
            placeholder="Oi! Toca no botão abaixo que eu te mando o link 👇"
            className="campo resize-y"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dm_quick_reply_label" className="rotulo block">
            Texto do botão de resposta rápida
          </label>
          <input
            id="dm_quick_reply_label"
            name="dm_quick_reply_label"
            type="text"
            defaultValue={automacao?.dm_quick_reply_label ?? ""}
            placeholder="Quero o link!"
            className="campo"
          />
        </div>
      </section>

      <section className="cartao space-y-4 px-4 py-4">
        <h3 className="text-sm font-semibold">Link (enviado quando a pessoa toca no botão)</h3>
        <div className="space-y-1.5">
          <label htmlFor="link_message_text" className="rotulo block">
            Mensagem
          </label>
          <textarea
            id="link_message_text"
            name="link_message_text"
            rows={2}
            defaultValue={automacao?.link_message_text ?? ""}
            placeholder="Aqui está! 🚀"
            className="campo resize-y"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="link_button_label" className="rotulo block">
              Rótulo do botão
            </label>
            <input
              id="link_button_label"
              name="link_button_label"
              type="text"
              defaultValue={automacao?.link_button_label ?? ""}
              placeholder="Acessar"
              className="campo"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="link_url" className="rotulo block">
              URL
            </label>
            <input
              id="link_url"
              name="link_url"
              type="url"
              defaultValue={automacao?.link_url ?? ""}
              placeholder="https://..."
              className="campo"
            />
          </div>
        </div>
      </section>

      <section className="cartao space-y-4 px-4 py-4">
        <h3 className="text-sm font-semibold">Lembrete (opcional)</h3>
        <div className="space-y-1.5">
          <label htmlFor="reminder_text" className="rotulo block">
            Mensagem
          </label>
          <textarea
            id="reminder_text"
            name="reminder_text"
            rows={2}
            defaultValue={automacao?.reminder_text ?? ""}
            placeholder="Ainda não viu o link? Está aqui de novo 👇"
            className="campo resize-y"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reminder_delay_minutes" className="rotulo block">
            Atraso (minutos após enviar o link)
          </label>
          <input
            id="reminder_delay_minutes"
            name="reminder_delay_minutes"
            type="number"
            min={1}
            defaultValue={automacao?.reminder_delay_minutes ?? 60}
            className="campo max-w-40"
          />
        </div>
      </section>

      <button type="submit" disabled={pendente} className="btn btn-primary brilho-hover">
        {pendente && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {rotuloEnvio}
      </button>
    </form>
  );
}

function Checkbox({ id, label, defaultChecked }: { id: string; label: string; defaultChecked: boolean }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input type="checkbox" id={id} name={id} defaultChecked={defaultChecked} className="h-4 w-4 accent-accent" />
      {label}
    </label>
  );
}
