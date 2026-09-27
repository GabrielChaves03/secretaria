"use client";

import { useEffect, useState } from "react";

const TROCA_QR_S = 15;

type Resposta = { estado?: string; qr?: string | null; erro?: string };

/** QR que se renova sozinho + aviso quando a conexão abre. */
export function ConectarWhatsapp({ token }: { token: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [estado, setEstado] = useState("verificando…");
  const [erro, setErro] = useState<string | null>(null);
  const [restante, setRestante] = useState(TROCA_QR_S);

  const conectado = estado === "open";

  useEffect(() => {
    if (conectado) return;

    let vivo = true;
    let segundos = TROCA_QR_S;

    async function consultar(pedirQr: boolean) {
      try {
        const r = await fetch(
          `/api/whatsapp/qr?t=${encodeURIComponent(token)}${pedirQr ? "&qr=1" : ""}`,
          { cache: "no-store" },
        );
        const j: Resposta = await r.json();
        if (!vivo) return;
        if (j.erro) return setErro(j.erro);
        setErro(null);
        if (j.estado) setEstado(j.estado);
        if (j.qr) setQr(j.qr);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : String(e));
      }
    }

    consultar(true);
    const relogio = setInterval(() => {
      segundos -= 1;
      if (segundos <= 0) {
        segundos = TROCA_QR_S;
        consultar(true);
      } else if (segundos % 3 === 0) {
        consultar(false);
      }
      setRestante(segundos);
    }, 1000);

    return () => {
      vivo = false;
      clearInterval(relogio);
    };
  }, [token, conectado]);

  if (conectado) {
    return (
      <div className="mt-6 space-y-2">
        <p className="text-lg font-semibold text-accent">✅ Conectado!</p>
        <p className="text-sm text-fg-secondary">
          Pronto — pode fechar esta página.
        </p>
      </div>
    );
  }

  if (erro === "Link inválido.") {
    return (
      <p className="mt-6 text-sm text-danger">
        Este link não é válido ou expirou. Peça um novo a quem te enviou.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-fg-secondary">
        No celular: <b>WhatsApp → Aparelhos conectados → Conectar aparelho</b>{" "}
        e escaneie o código abaixo.
      </p>
      <div className="mx-auto flex h-[300px] w-[300px] items-center justify-center rounded-[var(--radius)] bg-white p-2">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code do WhatsApp" className="h-full w-full" />
        ) : (
          <span className="text-sm text-neutral-500">Carregando…</span>
        )}
      </div>
      <p className="text-xs text-fg-tertiary">
        O código se renova sozinho — próxima troca em {restante}s. Pode
        escanear com calma.
      </p>
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}
