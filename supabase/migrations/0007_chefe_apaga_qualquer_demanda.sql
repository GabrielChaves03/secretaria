-- Migration: o chefe também pode apagar qualquer demanda.
-- Antes (0002): só o dono apagava. Agora: dono OU chefe.
-- Apagar a demanda já remove em cascata comentários e notificações.

drop policy "demandas_delete_proprio" on public.demandas;

create policy "demandas_delete_proprio_ou_chefe"
  on public.demandas
  for delete
  using ((select auth.uid()) = usuario_id or (select public.eh_chefe()));
