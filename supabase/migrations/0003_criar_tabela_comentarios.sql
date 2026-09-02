-- Migration: comentários das demandas.
-- Um comentário pertence a uma demanda e a um usuário. A RLS amarra tudo
-- ao dono da demanda: só quem é dono da demanda vê e cria comentários nela.

create table public.comentarios (
  id          uuid        primary key default gen_random_uuid(),
  demanda_id  uuid        not null references public.demandas (id) on delete cascade,
  usuario_id  uuid        not null references auth.users (id) on delete cascade,
  texto       text        not null,
  criado_em   timestamptz not null default now()
);

-- Listagem sempre por demanda; índice ajuda o planner.
create index comentarios_demanda_id_idx on public.comentarios (demanda_id);

-- Regra do projeto: RLS SEMPRE ligado em tabela nova.
alter table public.comentarios enable row level security;

-- Ver comentários: só os das demandas do próprio usuário.
create policy "comentarios_select_dono_da_demanda"
  on public.comentarios
  for select
  using (
    exists (
      select 1
      from public.demandas d
      where d.id = comentarios.demanda_id
        and d.usuario_id = (select auth.uid())
    )
  );

-- Criar comentário: precisa ser o autor (usuario_id) E dono da demanda.
create policy "comentarios_insert_dono_da_demanda"
  on public.comentarios
  for insert
  with check (
    (select auth.uid()) = usuario_id
    and exists (
      select 1
      from public.demandas d
      where d.id = demanda_id
        and d.usuario_id = (select auth.uid())
    )
  );
