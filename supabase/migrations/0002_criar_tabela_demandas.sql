-- Migration: tabela de demandas — o núcleo do sistema.
-- Cada demanda pertence a um usuário (auth.users). A RLS garante que
-- cada pessoa só enxerga e mexe nas próprias demandas.

create table public.demandas (
  id            uuid        primary key default gen_random_uuid(),
  usuario_id    uuid        not null references auth.users (id) on delete cascade,
  titulo        text        not null,
  descricao     text,
  data_entrega  date,
  dificuldade   text        not null default 'media'
                  check (dificuldade in ('facil', 'media', 'dificil')),
  status        text        not null default 'pendente'
                  check (status in ('pendente', 'em_andamento', 'concluida')),
  criado_em     timestamptz not null default now()
);

-- As consultas sempre filtram pelo dono; o índice ajuda o planner.
create index demandas_usuario_id_idx on public.demandas (usuario_id);

-- Regra do projeto: RLS SEMPRE ligado em tabela nova.
alter table public.demandas enable row level security;

-- Cada usuário só lê, cria, edita e apaga as próprias demandas.
create policy "demandas_select_proprio"
  on public.demandas
  for select
  using ((select auth.uid()) = usuario_id);

create policy "demandas_insert_proprio"
  on public.demandas
  for insert
  with check ((select auth.uid()) = usuario_id);

create policy "demandas_update_proprio"
  on public.demandas
  for update
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "demandas_delete_proprio"
  on public.demandas
  for delete
  using ((select auth.uid()) = usuario_id);
