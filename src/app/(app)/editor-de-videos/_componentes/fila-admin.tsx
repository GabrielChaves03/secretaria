"use client";

import { useActionState, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { formatarDataHoraBR } from "@/lib/manychat-contas";
import {
  EXTENSOES_VIDEO_ACEITAS,
  PILL_STATUS_VIDEO,
  ROTULO_STATUS_VIDEO,
  type VideoPedidoAdmin,
} from "@/lib/video-pedidos";
import { concluirPedidoVideo, marcarEmEdicao, type EstadoConcluirVideo } from "../actions";

export function FilaAdmin({ fila }: { fila: VideoPedidoAdmin[] }) {
  if (fila.length === 0) {
    return (
      <div className="cartao flex flex-col items-center gap-1 px-5 py-10 text-center">
        <p className="text-sm text-fg-secondary">Nenhum pedido pendente em nenhum escritório.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fila.map((pedido) => (
        <ItemFilaAdmin key={pedido.id} pedido={pedido} />
      ))}
    </div>
  );
}

function ItemFilaAdmin({ pedido }: { pedido: VideoPedidoAdmin }) {
  const [erroEmEdicao, setErroEmEdicao] = useState<string | null>(null);
  const [pendenteEmEdicao, iniciar] = useTransition();
  const [estado, acaoForm, pendenteEnvio] = useActionState<EstadoConcluirVideo, FormData>(
    concluirPedidoVideo,
    undefined,
  );

  function marcarComoEmEdicao() {
    setErroEmEdicao(null);
    iniciar(async () => {
      const r = await marcarEmEdicao(pedido.id);
      if (r?.erro) setErroEmEdicao(r.erro);
    });
  }

  const sucesso = !!estado && "ok" in estado && estado.ok;

  return (
    <div className="cartao px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{pedido.nome_arquivo}</p>
          <p className="text-xs text-fg-tertiary">
            {pedido.escritorioNome} · enviado por {pedido.usuarioNome}
          </p>
          {pedido.instrucoes && (
            <p className="mt-0.5 line-clamp-2 text-xs text-fg-secondary">{pedido.instrucoes}</p>
          )}
          <p className="mt-1 text-xs text-fg-tertiary">{formatarDataHoraBR(pedido.criado_em)}</p>
        </div>
        <span className={PILL_STATUS_VIDEO[pedido.status]}>{ROTULO_STATUS_VIDEO[pedido.status]}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {pedido.urlOriginal && (
          <a href={pedido.urlOriginal} download className="btn btn-secondary btn-sm">
            <Download className="h-3.5 w-3.5" />
            Baixar original
          </a>
        )}
        {pedido.status === "pendente" && (
          <button
            type="button"
            onClick={marcarComoEmEdicao}
            disabled={pendenteEmEdicao}
            className="btn btn-warning btn-sm"
          >
            {pendenteEmEdicao ? "Marcando..." : "Marcar em edição"}
          </button>
        )}
      </div>
      {erroEmEdicao && <p className="mt-2 text-sm text-danger">{erroEmEdicao}</p>}

      {!sucesso && (
        <form action={acaoForm} className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input type="hidden" name="id" value={pedido.id} />
          <input
            type="file"
            name="video_editado"
            accept={EXTENSOES_VIDEO_ACEITAS}
            required
            className="campo max-w-[220px] text-xs"
          />
          <button type="submit" disabled={pendenteEnvio} className="btn btn-success btn-sm">
            {pendenteEnvio ? "Enviando..." : "Enviar editado e concluir"}
          </button>
          {estado && "erro" in estado && <p className="text-sm text-danger">{estado.erro}</p>}
        </form>
      )}
      {sucesso && <p className="mt-3 text-sm text-success">Vídeo editado enviado — pedido concluído.</p>}
    </div>
  );
}
