-- Migration inicial: tabela de perfis de usuário.
-- Espelha auth.users com dados de negócio (nome, telefone) e RLS ativado.

create table public.usuarios (
  id         uuid        primary key references auth.users (id) on delete cascade,
  nome       text,
  telefone   text,
  criado_em  timestamptz not null default now()
);

-- Regra do projeto: RLS SEMPRE ligado em tabela nova.
alter table public.usuarios enable row level security;

-- Cada usuário só enxerga e altera a própria linha.
create policy "usuarios_select_proprio"
  on public.usuarios
  for select
  using ((select auth.uid()) = id);

create policy "usuarios_insert_proprio"
  on public.usuarios
  for insert
  with check ((select auth.uid()) = id);

create policy "usuarios_update_proprio"
  on public.usuarios
  for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Cria a linha em public.usuarios automaticamente quando um auth.users nasce.
-- nome e telefone chegam via raw_user_meta_data (enviados no signUp).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, nome, telefone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nome',
    new.raw_user_meta_data ->> 'telefone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
