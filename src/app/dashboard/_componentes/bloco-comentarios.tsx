import { adicionarComentario } from "@/app/dashboard/actions";
import type { Comentario } from "@/lib/comentarios-consultas";

const FMT_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

type Props = {
  demandaId: string;
  comentarios: Comentario[];
  /** id do usuário logado — pra marcar os comentários dele como "Você". */
  usuarioId: string;
};

/**
 * Lista de comentários de uma demanda (mais recente primeiro) + campo para
 * adicionar um novo. Server Component — reaproveitado na listagem e na
 * tela de edição.
 */
export function BlocoComentarios({ demandaId, comentarios, usuarioId }: Props) {
  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {comentarios.length === 0 && (
          <li className="text-sm text-fg-tertiary">Nenhum comentário ainda.</li>
        )}
        {comentarios.map((c) => (
          <li key={c.id} className="rounded-[var(--radius-sm)] bg-surface-hover px-3 py-2 text-sm">
            <p className="whitespace-pre-wrap">{c.texto}</p>
            <p className="mt-1 text-xs text-fg-tertiary">
              {c.usuario_id === usuarioId ? "Você" : (c.autor_nome ?? "Alguém")}
              {" · "}
              {FMT_DATA_HORA.format(new Date(c.criado_em))}
            </p>
          </li>
        ))}
      </ul>

      <form action={adicionarComentario} className="space-y-2">
        <input type="hidden" name="demanda_id" value={demandaId} />
        <textarea
          name="texto"
          rows={2}
          required
          placeholder="Escreva um comentário..."
          className="campo resize-y"
        />
        <button type="submit" className="btn btn-secondary btn-sm">
          Comentar
        </button>
      </form>
    </div>
  );
}
