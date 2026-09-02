-- Migration: notificações. Avisam o dono da demanda quando OUTRA pessoa
-- (na prática, um chefe) comenta, muda o status ou edita a demanda dele.
-- As linhas nascem só pelas triggers abaixo (SECURITY DEFINER, ignoram a RLS).

create table public.notificacoes (
  id          uuid        primary key default gen_random_uuid(),
  usuario_id  uuid        not null references auth.users (id) on delete cascade,
  demanda_id  uuid        references public.demandas (id) on delete cascade,
  tipo        text        not null check (tipo in ('comentario', 'status', 'edicao')),
  descricao   text        not null,
  lida        boolean     not null default false,
  criado_em   timestamptz not null default now()
);

create index notificacoes_usuario_nao_lida_idx
  on public.notificacoes (usuario_id, lida);

alter table public.notificacoes enable row level security;

-- Cada usuário só vê e marca como lidas as próprias notificações.
create policy "notificacoes_select_proprio"
  on public.notificacoes
  for select
  using ((select auth.uid()) = usuario_id);

create policy "notificacoes_update_proprio"
  on public.notificacoes
  for update
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

-- Rótulo amigável de status, usado no texto da notificação.
create function public.rotulo_status(s text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case s
    when 'pendente' then 'Pendente'
    when 'em_andamento' then 'Em andamento'
    when 'concluida' then 'Concluída'
    else s
  end;
$$;

-- Comentário novo -> notifica o dono da demanda (se não foi ele quem comentou).
create function public.notificar_novo_comentario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dono_id uuid;
  titulo_demanda text;
begin
  select usuario_id, titulo into dono_id, titulo_demanda
  from public.demandas where id = new.demanda_id;

  if dono_id is not null and dono_id is distinct from new.usuario_id then
    insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao)
    values (
      dono_id, new.demanda_id, 'comentario',
      coalesce(new.autor_nome, 'Alguém') || ' comentou em "' || titulo_demanda || '"'
    );
  end if;

  return new;
end;
$$;

create trigger trg_notificar_novo_comentario
  after insert on public.comentarios
  for each row execute function public.notificar_novo_comentario();

-- Status/edição por outra pessoa -> notifica o dono da demanda.
create function public.notificar_mudanca_demanda()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem uuid := (select auth.uid());
begin
  -- Só notifica quando quem alterou não é o dono (ex.: um chefe).
  if quem is null or quem is not distinct from old.usuario_id then
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao)
    values (old.usuario_id, new.id, 'status',
      'Status de "' || new.titulo || '" mudou para ' || public.rotulo_status(new.status));
  elsif new.titulo is distinct from old.titulo
     or new.descricao is distinct from old.descricao
     or new.data_entrega is distinct from old.data_entrega
     or new.dificuldade is distinct from old.dificuldade then
    insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao)
    values (old.usuario_id, new.id, 'edicao',
      'A demanda "' || new.titulo || '" foi editada');
  end if;

  return new;
end;
$$;

create trigger trg_notificar_mudanca_demanda
  after update on public.demandas
  for each row execute function public.notificar_mudanca_demanda();
