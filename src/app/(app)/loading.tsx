/**
 * Esqueleto mostrado na hora ao trocar de aba, enquanto a página nova busca
 * os dados no servidor (a barra do topo e a lateral continuam no lugar).
 */
export default function Carregando() {
  return (
    <main
      className="flex w-full flex-1 flex-col px-4 py-6 md:px-6"
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="h-7 w-48 animate-pulse rounded-[var(--radius)] bg-surface-hover" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded-[var(--radius)] bg-surface-hover/70" />
      <div className="mt-6 flex flex-col gap-4 md:flex-row">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex w-full flex-col gap-2.5 rounded-[var(--radius-lg)] bg-sidebar p-2.5 shadow-[inset_0_0_0_1px_var(--border)] md:w-[19.5rem]"
          >
            <div className="h-5 w-32 animate-pulse rounded-[var(--radius-sm)] bg-surface-hover" />
            <div className="h-20 animate-pulse rounded-[var(--radius)] bg-surface-hover/70" />
            <div className="h-20 animate-pulse rounded-[var(--radius)] bg-surface-hover/50" />
          </div>
        ))}
      </div>
    </main>
  );
}
