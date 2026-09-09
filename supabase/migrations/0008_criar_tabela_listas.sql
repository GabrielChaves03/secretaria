-- Migration: listas personalizadas do quadro (colunas extras, além das três
-- automáticas por status/prazo). Um card sem `lista_id` continua caindo nas
-- colunas automáticas; com `lista_id`, aparece na lista escolhida.
--
-- Visibilidade igual à das demandas: o dono da lista e os chefes.

create table public.listas (
  id          uuid        primary key default gen_random_uuid(),
  usuario_id  uuid        not null references auth.users (id) on delete cascade,
  nome        text        not null,
  ordem       integer     not null default 0,
  criado_em   timestamptz not null default now()
);

create index listas_usuario_id_idx on public.listas (usuario_id);

-- Regra do projeto: RLS SEMPRE ligado em tabela nova.
alter table public.listas enable row level security;

-- Dono ou chefe leem; só o dono cria; dono ou chefe editam/apagam.
create policy "listas_select_proprio_ou_chefe"
  on public.listas
  for select
  using ((select auth.uid()) = usuario_id or (select public.eh_chefe()));

create policy "listas_insert_proprio"
  on public.listas
  for insert
  with check ((select auth.uid()) = usuario_id);

create policy "listas_update_proprio_ou_chefe"
  on public.listas
  for update
  using ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  with check ((select auth.uid()) = usuario_id or (select public.eh_chefe()));

create policy "listas_delete_proprio_ou_chefe"
  on public.listas
  for delete
  using ((select auth.uid()) = usuario_id or (select public.eh_chefe()));

-- Vínculo demanda -> lista. Nulo = colunas automáticas.
-- ON DELETE SET NULL: apagar a lista devolve os cards para o fluxo automático.
alter table public.demandas
  add column lista_id uuid references public.listas (id) on delete set null;

create index demandas_lista_id_idx on public.demandas (lista_id);
