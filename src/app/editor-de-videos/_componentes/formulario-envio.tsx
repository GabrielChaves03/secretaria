"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Captions, UploadCloud, X } from "lucide-react";
import { criarPedidoVideo, type EstadoEnvioVideo } from "../actions";
import { EXTENSOES_VIDEO_ACEITAS } from "@/lib/video-pedidos";

export function FormularioEnvioVideo() {
  const [estado, acaoForm, pendente] = useActionState<EstadoEnvioVideo, FormData>(
    criarPedidoVideo,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const sucesso = !!estado && "ok" in estado && estado.ok;

  useEffect(() => {
    if (!sucesso) return;
    setArquivo(null);
    formRef.current?.reset();
  }, [sucesso]);

  function selecionarArquivo(lista: FileList | null) {
    const arquivoSelecionado = lista?.[0];
    if (!arquivoSelecionado) return;
    setArquivo(arquivoSelecionado);
    if (inputRef.current) inputRef.current.files = lista;
  }

  return (
    <form ref={formRef} action={acaoForm} className="cartao p-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Caixa de drop / clique para escolher o vídeo */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            selecionarArquivo(e.dataTransfer.files);
          }}
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed px-4 py-8 text-center transition-colors ${
            arrastando
              ? "border-accent bg-accent-subtle-bg"
              : "border-border hover:border-border-strong hover:bg-surface-hover"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            name="video"
            accept={EXTENSOES_VIDEO_ACEITAS}
            className="hidden"
            onChange={(e) => selecionarArquivo(e.target.files)}
          />
          <UploadCloud className="h-6 w-6 text-fg-secondary" />
          {arquivo ? (
            <div className="flex max-w-full items-center gap-2 text-sm">
              <span className="max-w-[220px] truncate font-medium">{arquivo.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setArquivo(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="text-fg-tertiary hover:text-danger"
                aria-label="Remover vídeo selecionado"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">Arraste o vídeo aqui</p>
              <p className="text-xs text-fg-tertiary">ou clique para escolher um arquivo</p>
            </>
          )}
        </div>

        {/* Instruções extras pro agente */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="instrucoes" className="rotulo block">
            Instruções (opcional)
          </label>
          <textarea
            id="instrucoes"
            name="instrucoes"
            rows={5}
            placeholder="Ex.: cortar as repetições, sem legenda, deixar só o áudio limpo..."
            className="campo h-full resize-none"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled
          title="Legenda automática ainda em validação"
          className="btn btn-secondary btn-sm"
        >
          <Captions className="h-3.5 w-3.5" />
          Estilo de legenda — em breve
        </button>

        <div className="flex items-center gap-3">
          {estado && "erro" in estado && <p className="text-sm text-danger">{estado.erro}</p>}
          <button
            type="submit"
            disabled={pendente || !arquivo}
            className="btn btn-primary brilho-hover"
          >
            {pendente ? "Enviando..." : "Enviar para edição"}
          </button>
        </div>
      </div>
    </form>
  );
}
