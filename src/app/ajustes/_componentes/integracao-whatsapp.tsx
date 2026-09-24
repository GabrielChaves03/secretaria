"use client";

import { useActionState, useState } from "react";
import {
  salvarIntegracaoWhatsapp,
  testarWhatsapp,
  type EstadoAjuste,
} from "@/app/ajustes/actions";
import {
  ROTULO_AVISO_WHATSAPP,
  type ConfigWhatsapp,
  type TipoAvisoWhatsapp,
} from "@/lib/whatsapp";

const EVENTOS: { chave: TipoAvisoWhatsapp; campo: keyof ConfigWhatsapp }[] = [
  { chave: "atribuicao", campo: "notif_atribuicao" },
  { chave: "status", campo: "notif_status" },
  { chave: "comentario", campo: "notif_comentario" },
  { chave: "prazo", campo: "notif_prazo" },
  { chave: "compromisso", campo: "notif_compromisso" },
];

export function IntegracaoWhatsapp({
  config,
  gatewayPadrao,
}: {
  config: ConfigWhatsapp | null;
  /** O app tem o gateway do Nitro configurado — URL/token viram opcionais. */
  gatewayPadrao: boolean;
}) {
  const [url, setUrl] = useState(config?.endpoint_url ?? "");
  const [token, setToken] = useState(config?.token ?? "");

  const [estadoSalvar, acaoSalvar, salvando] = useActionState<
    EstadoAjuste,
    FormData
  >(salvarIntegracaoWhatsapp, undefined);
  const [estadoTeste, acaoTeste, testando] = useActionState<
    EstadoAjuste,
    FormData
  >(testarWhatsapp, undefined);

  return (
    <div className="mt-3 space-y-4">
      <form action={acaoSalvar} className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={config?.ativo ?? false}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Integração ativa
        </label>

        {gatewayPadrao && (
          <p className="rounded-[var(--radius)] bg-surface-hover px-3 py-2 text-xs text-fg-secondary">
            As mensagens saem pelo WhatsApp do Nitro. Só preencha URL e token
            abaixo se o escritório quiser usar um gateway próprio.
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="endpoint_url" className="rotulo block">
            URL do endpoint (envio de mensagem){gatewayPadrao ? " — opcional" : ""}
          </label>
          <input
            id="endpoint_url"
            name="endpoint_url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.exemplo.com/enviar"
            className="campo font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="token" className="rotulo block">
            Token / chave de API
          </label>
          <input
            id="token"
            name="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="••••••••"
            autoComplete="off"
            className="campo font-mono text-xs"
          />
        </div>

        <fieldset className="space-y-1.5">
          <legend className="rotulo">Quando avisar</legend>
          {EVENTOS.map(({ chave, campo }) => (
            <label key={chave} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={campo}
                defaultChecked={
                  config ? (config[campo] as boolean) : true
                }
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {ROTULO_AVISO_WHATSAPP[chave]}
            </label>
          ))}
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="btn btn-primary btn-sm"
          >
            {salvando ? "Salvando…" : "Salvar integração"}
          </button>
          {estadoSalvar && "ok" in estadoSalvar && (
            <span className="text-sm text-accent-subtle-fg">
              {estadoSalvar.ok}
            </span>
          )}
          {estadoSalvar && "erro" in estadoSalvar && (
            <span className="text-sm text-danger">{estadoSalvar.erro}</span>
          )}
        </div>
      </form>

      <form
        action={acaoTeste}
        className="space-y-2 border-t border-border pt-3"
      >
        <input type="hidden" name="endpoint_url" value={url} />
        <input type="hidden" name="token" value={token} />
        <label htmlFor="telefone_teste" className="rotulo block">
          Enviar mensagem de teste para
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="telefone_teste"
            name="telefone_teste"
            type="tel"
            placeholder="(11) 99999-9999"
            className="campo max-w-[220px]"
          />
          <button
            type="submit"
            disabled={testando}
            className="btn btn-secondary btn-sm"
          >
            {testando ? "Enviando…" : "Enviar teste"}
          </button>
        </div>
        {estadoTeste && "ok" in estadoTeste && (
          <p className="text-sm text-accent-subtle-fg">{estadoTeste.ok}</p>
        )}
        {estadoTeste && "erro" in estadoTeste && (
          <p className="text-sm text-danger">{estadoTeste.erro}</p>
        )}
        <p className="text-xs text-fg-tertiary">
          O teste usa a URL e o token digitados acima (não precisa ter salvado)
          {gatewayPadrao ? " — em branco, usa o WhatsApp do Nitro" : ""}.
        </p>
      </form>
    </div>
  );
}
