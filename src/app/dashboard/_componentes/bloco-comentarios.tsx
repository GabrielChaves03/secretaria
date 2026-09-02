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
      <ul className="space-y-2">
        {comentarios.length === 0 && (
          <li className="text-sm text-zinc-500">Nenhum comentário ainda.</li>
        )}
        {comentarios.map((c) => (
          <li
            key={c.id}
            className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
          >
            <p className="whitespace-pre-wrap">{c.texto}</p>
            <p className="mt-1 text-xs text-zinc-400">
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
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Comentar
        </button>
      </form>
    </div>
  );
}
