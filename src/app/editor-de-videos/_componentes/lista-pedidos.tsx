"use client";

import { useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { formatarDataHoraBR } from "@/lib/manychat-contas";
import { PILL_STATUS_VIDEO, ROTULO_STATUS_VIDEO, type VideoPedido } from "@/lib/video-pedidos";
import { apagarPedidoVideo } from "../actions";

export function ListaPedidos({ pedidos }: { pedidos: VideoPedido[] }) {
  if (pedidos.length === 0) {
    return (
      <div className="cartao flex flex-col items-center gap-1 px-5 py-10 text-center">
        <p className="text-sm text-fg-secondary">Nenhum vídeo enviado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pedidos.map((pedido) => (
        <ItemPedido key={pedido.id} pedido={pedido} />
      ))}
    </div>
  );
}

function ItemPedido({ pedido }: { pedido: VideoPedido }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function apagar() {
    if (!window.confirm(`Apagar "${pedido.nome_arquivo}"? Os arquivos de vídeo são removidos.`)) {
      return;
    }
    setErro(null);
    iniciar(async () => {
      const r = await apagarPedidoVideo(pedido.id);
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="cartao px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{pedido.nome_arquivo}</p>
          {pedido.instrucoes && (
            <p className="mt-0.5 line-clamp-2 text-xs text-fg-secondary">{pedido.instrucoes}</p>
          )}
          <p className="mt-1 text-xs text-fg-tertiary">{formatarDataHoraBR(pedido.criado_em)}</p>
        </div>
        <span className={PILL_STATUS_VIDEO[pedido.status]}>{ROTULO_STATUS_VIDEO[pedido.status]}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {pedido.status === "concluido" && pedido.urlEditado && (
          <a href={pedido.urlEditado} download className="btn btn-primary btn-sm brilho-hover">
            <Download className="h-3.5 w-3.5" />
            Baixar vídeo editado
          </a>
        )}
        <button
          type="button"
          onClick={apagar}
          disabled={pendente}
          className="btn btn-danger btn-sm"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {pendente ? "Apagando..." : "Apagar"}
        </button>
      </div>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}
