"use client";

import { useState } from "react";
import { Loader2, X, ExternalLink } from "lucide-react";

type ItemMidia = {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  permalink: string;
};

type Props = {
  contaId: string;
  midiaIdInicial?: string | null;
  permalinkInicial?: string | null;
  thumbnailInicial?: string | null;
};

/** Seletor de post/reel específico (opcional) pra restringir uma automação. */
export function SeletorMidia({
  contaId,
  midiaIdInicial,
  permalinkInicial,
  thumbnailInicial,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemMidia[]>([]);
  const [selecionado, setSelecionado] = useState<{
    id: string;
    permalink: string;
    thumbnail: string | null;
  } | null>(
    midiaIdInicial
      ? { id: midiaIdInicial, permalink: permalinkInicial ?? "", thumbnail: thumbnailInicial ?? null }
      : null,
  );

  function alternarSeletor() {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);

    if (vaiAbrir && itens.length === 0) {
      setCarregando(true);
      setErro(null);
      fetch(`/api/manychat/instagram/media?contaId=${contaId}`)
        .then(async (r) => {
          if (!r.ok) throw new Error((await r.json()).error ?? "Falha ao buscar posts");
          return r.json();
        })
        .then((data: { data: ItemMidia[] }) => setItens(data.data ?? []))
        .catch((e) => setErro(e instanceof Error ? e.message : "Erro desconhecido"))
        .finally(() => setCarregando(false));
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="target_media_id" value={selecionado?.id ?? ""} />
      <input type="hidden" name="target_media_permalink" value={selecionado?.permalink ?? ""} />
      <input type="hidden" name="target_media_thumbnail_url" value={selecionado?.thumbnail ?? ""} />

      <div className="flex flex-wrap items-center gap-3">
        {selecionado ? (
          <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border p-2">
            {selecionado.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selecionado.thumbnail} alt="Post selecionado" className="h-14 w-14 rounded object-cover" />
            )}
            <a
              href={selecionado.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Ver post
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setSelecionado(null)}
              aria-label="Remover post selecionado"
              className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] text-fg-tertiary hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-fg-tertiary">
            Nenhum post selecionado (a automação vale para qualquer post/reels)
          </span>
        )}

        <button type="button" onClick={alternarSeletor} className="btn btn-secondary btn-sm">
          {aberto ? "Fechar" : "Escolher post específico"}
        </button>
      </div>

      {aberto && (
        <div className="rounded-[var(--radius)] border border-border p-3">
          {carregando && (
            <p className="flex items-center gap-2 text-sm text-fg-tertiary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando posts…
            </p>
          )}
          {erro && <p className="text-sm text-danger">{erro}</p>}
          {!carregando && !erro && itens.length === 0 && (
            <p className="text-sm text-fg-tertiary">Nenhum post encontrado.</p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {itens.map((item) => {
              const thumb = item.thumbnail_url ?? item.media_url;
              const ativo = selecionado?.id === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() =>
                    setSelecionado({ id: item.id, permalink: item.permalink, thumbnail: thumb ?? null })
                  }
                  title={item.caption ?? item.id}
                  className={`overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors ${
                    ativo ? "border-accent" : "border-transparent hover:border-border-strong"
                  }`}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-raised text-[10px] text-fg-tertiary">
                      sem imagem
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
