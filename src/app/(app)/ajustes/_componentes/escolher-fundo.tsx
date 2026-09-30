"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check } from "lucide-react";
import { salvarAparencia } from "@/app/(app)/ajustes/actions";
import { FUNDOS } from "@/lib/aparencia";

/**
 * Galeria de fundos de tela, estilo "capa" do Notion — clicar já aplica
 * (sem botão salvar). Otimista: marca na hora, desfaz se a ação falhar.
 */
export function EscolherFundo({ atual }: { atual: string | null }) {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState(atual);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function escolher(chave: string) {
    if (chave === selecionado || pendente) return;
    const anterior = selecionado;
    setErro(null);
    setSelecionado(chave);
    iniciar(async () => {
      const resultado = await salvarAparencia(chave);
      if (resultado?.erro) {
        setErro(resultado.erro);
        setSelecionado(anterior);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FUNDOS.map((f) => {
          const ativo = selecionado === f.chave;
          return (
            <button
              key={f.chave}
              type="button"
              onClick={() => escolher(f.chave)}
              disabled={pendente}
              aria-pressed={ativo}
              title={f.rotulo}
              className={`relative aspect-video overflow-hidden rounded-[var(--radius)] transition-[box-shadow] disabled:cursor-default disabled:opacity-70 ${
                ativo
                  ? "shadow-[0_0_0_2px_var(--accent)]"
                  : "shadow-[inset_0_0_0_1px_var(--border)] hover:shadow-[inset_0_0_0_1px_var(--border-strong)]"
              }`}
            >
              <Image
                src={f.arquivo}
                alt={f.rotulo}
                fill
                sizes="(max-width: 640px) 50vw, 220px"
                className="object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5 text-left text-[11px] font-medium text-white">
                {f.rotulo}
              </span>
              {ativo && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}
