-- ============================================================
-- Multi-tenant: ESCRITÓRIOS
--
-- O app deixa de ser exclusivo de uma empresa. Cada conta pertence a
-- NO MÁXIMO um escritório. Quem cria um escritório vira 'chefe' dele;
-- quem entra pelo código vira 'funcionario'. Todo dado (demandas,
-- listas, comentários, notificações) é isolado por escritório via RLS.
--
-- ⚠️ Esta migration ZERA os dados de teste (demandas, listas,
--    comentários, notificações) e tira todos os usuários de qualquer
--    escritório. As contas de login (auth.users) são preservadas.
-- ============================================================

-- ---------- 1. Tabela de escritórios ----------
create table public.escritorios (
  id         uuid        primary key default gen_random_uuid(),
  nome       text        not null,
  codigo     text        not null unique,
  criado_por uuid        references auth.users (id) on delete set null,
  criado_em  timestamptz not null default now()
);

-- ---------- 2. Vínculo usuário -> escritório (nulo = ainda não escolheu) ----------
alter table public.usuarios
  add column escritorio_id uuid references public.escritorios (id) on delete set null;

create index usuarios_escritorio_id_idx on public.usuarios (escritorio_id);

-- ---------- 3. Helper: o escritório do usuário logado ----------
create function public.meu_escritorio()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select escritorio_id from public.usuarios where id = (select auth.uid());
$$;

-- ---------- 4. RLS de escritorios ----------
alter table public.escritorios enable row level security;

-- Só enxerga (e edita, se chefe) o próprio escritório.
-- Criar/entrar/sair acontece pelas funções SECURITY DEFINER mais abaixo.
create policy "escritorios_select_membro"
  on public.escritorios
  for select
  using (id = (select public.meu_escritorio()));

create policy "escritorios_update_chefe"
  on public.escritorios
  for update
  using (id = (select public.meu_escritorio()) and (select public.eh_chefe()))
  with check (id = (select public.meu_escritorio()) and (select public.eh_chefe()));

-- ---------- 5. Zerar dados de teste ----------
truncate table
  public.demandas,
  public.listas,
  public.comentarios,
  public.notificacoes
  cascade;

-- ---------- 6. escritorio_id nas tabelas de dados (tabelas já vazias) ----------
alter table public.demandas
  add column escritorio_id uuid not null references public.escritorios (id) on delete cascade;
alter table public.listas
  add column escritorio_id uuid not null references public.escritorios (id) on delete cascade;
alter table public.comentarios
  add column escritorio_id uuid not null references public.escritorios (id) on delete cascade;
alter table public.notificacoes
  add column escritorio_id uuid not null references public.escritorios (id) on delete cascade;

create index demandas_escritorio_id_idx     on public.demandas (escritorio_id);
create index listas_escritorio_id_idx       on public.listas (escritorio_id);
create index comentarios_escritorio_id_idx  on public.comentarios (escritorio_id);
create index notificacoes_escritorio_id_idx on public.notificacoes (escritorio_id);

-- ---------- 7. Tirar todos os usuários de escritório / papel ----------
update public.usuarios set escritorio_id = null, papel = 'funcionario';

-- ---------- 8. Preencher escritorio_id automaticamente nos inserts ----------
create function public.preencher_escritorio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.escritorio_id is null then
    new.escritorio_id := public.meu_escritorio();
  end if;
  return new;
end;
$$;

create trigger demandas_preenche_escritorio
  before insert on public.demandas
  for each row execute function public.preencher_escritorio();

create trigger listas_preenche_escritorio
  before insert on public.listas
  for each row execute function public.preencher_escritorio();

create function public.preencher_escritorio_comentario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.escritorio_id := (
    select escritorio_id from public.demandas where id = new.demanda_id
  );
  return new;
end;
$$;

create trigger comentarios_preenche_escritorio
  before insert on public.comentarios
  for each row execute function public.preencher_escritorio_comentario();

-- ---------- 9. Funções de entrada/gestão (SECURITY DEFINER) ----------

-- Código curto e legível (sem 0/O/1/I), garantidamente único.
create function public.gerar_codigo_escritorio()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  cod text;
  i int;
begin
  loop
    cod := '';
    for i in 1..6 loop
      cod := cod || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.escritorios where codigo = cod);
  end loop;
  return cod;
end;
$$;

-- Cria um escritório e coloca o usuário logado como chefe.
create function public.criar_escritorio(p_nome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sessão inválida.';
  end if;
  p_nome := btrim(coalesce(p_nome, ''));
  if p_nome = '' then
    raise exception 'Informe o nome do escritório.';
  end if;
  if exists (select 1 from public.usuarios where id = uid and escritorio_id is not null) then
    raise exception 'Você já pertence a um escritório.';
  end if;

  with novo as (
    insert into public.escritorios (nome, codigo, criado_por)
    values (left(p_nome, 60), public.gerar_codigo_escritorio(), uid)
    returning id
  )
  update public.usuarios
    set escritorio_id = (select id from novo), papel = 'chefe'
    where id = uid;
end;
$$;

-- Entra num escritório existente pelo código, como funcionário.
create function public.entrar_no_escritorio(p_codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  alvo uuid;
begin
  if uid is null then
    raise exception 'Sessão inválida.';
  end if;
  if exists (select 1 from public.usuarios where id = uid and escritorio_id is not null) then
    raise exception 'Você já pertence a um escritório.';
  end if;

  select id into alvo from public.escritorios
    where codigo = upper(btrim(coalesce(p_codigo, '')));
  if alvo is null then
    raise exception 'Código inválido.';
  end if;

  update public.usuarios set escritorio_id = alvo, papel = 'funcionario' where id = uid;
end;
$$;

-- Sai do escritório atual. Bloqueia se você for o único chefe (havendo outros
-- membros). Se o escritório ficar vazio, ele é removido (cascata).
create function public.sair_do_escritorio()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  meu uuid;
  meu_papel text;
  n_membros int;
  n_chefes int;
begin
  select escritorio_id, papel into meu, meu_papel from public.usuarios where id = uid;
  if meu is null then
    return;
  end if;

  select count(*) into n_membros from public.usuarios where escritorio_id = meu;
  select count(*) into n_chefes from public.usuarios where escritorio_id = meu and papel = 'chefe';

  if meu_papel = 'chefe' and n_chefes <= 1 and n_membros > 1 then
    raise exception 'Você é o único chefe. Promova outro membro antes de sair.';
  end if;

  update public.usuarios set escritorio_id = null, papel = 'funcionario' where id = uid;

  if n_membros <= 1 then
    delete from public.escritorios where id = meu;
  end if;
end;
$$;

-- Chefe define o papel de um membro do próprio escritório.
create function public.definir_papel_membro(p_usuario uuid, p_papel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  meu uuid;
  n_chefes int;
begin
  if not (select public.eh_chefe()) then
    raise exception 'Só o chefe pode alterar papéis.';
  end if;
  if p_papel not in ('chefe', 'funcionario') then
    raise exception 'Papel inválido.';
  end if;

  select escritorio_id into meu from public.usuarios where id = (select auth.uid());
  if not exists (select 1 from public.usuarios where id = p_usuario and escritorio_id = meu) then
    raise exception 'Esse usuário não é do seu escritório.';
  end if;

  if p_papel = 'funcionario' then
    select count(*) into n_chefes from public.usuarios where escritorio_id = meu and papel = 'chefe';
    if n_chefes <= 1
       and exists (select 1 from public.usuarios where id = p_usuario and papel = 'chefe') then
      raise exception 'O escritório precisa de pelo menos um chefe.';
    end if;
  end if;

  update public.usuarios set papel = p_papel where id = p_usuario;
end;
$$;

-- Chefe remove um membro (a pessoa fica sem escritório).
create function public.remover_membro(p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  meu uuid;
begin
  if not (select public.eh_chefe()) then
    raise exception 'Só o chefe pode remover membros.';
  end if;
  if p_usuario = uid then
    raise exception 'Para sair você mesmo, use "Sair do escritório".';
  end if;

  select escritorio_id into meu from public.usuarios where id = uid;
  if not exists (select 1 from public.usuarios where id = p_usuario and escritorio_id = meu) then
    raise exception 'Esse usuário não é do seu escritório.';
  end if;

  update public.usuarios set escritorio_id = null, papel = 'funcionario' where id = p_usuario;
end;
$$;

-- Chefe gera um código novo (invalida o antigo).
create function public.regenerar_codigo()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  meu uuid;
  novo text;
begin
  if not (select public.eh_chefe()) then
    raise exception 'Só o chefe pode gerar um código novo.';
  end if;
  select escritorio_id into meu from public.usuarios where id = (select auth.uid());
  novo := public.gerar_codigo_escritorio();
  update public.escritorios set codigo = novo where id = meu;
  return novo;
end;
$$;

-- ---------- 10. Trava: o cliente não troca o próprio papel/escritório ----------
-- Só as funções SECURITY DEFINER acima podem (rodam como o dono da função,
-- não como o papel 'authenticated' do PostgREST).
create function public.usuarios_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.papel is distinct from old.papel
          or new.escritorio_id is distinct from old.escritorio_id) then
    raise exception 'Alteração de papel/escritório não é permitida por aqui.';
  end if;
  return new;
end;
$$;

create trigger usuarios_guard_before_update
  before update on public.usuarios
  for each row execute function public.usuarios_guard();

-- ---------- 11. RLS: escopo por escritório em tudo ----------

-- usuarios: cada um vê a própria linha; o chefe vê os colegas do escritório.
drop policy if exists "usuarios_select_proprio_ou_chefe" on public.usuarios;
create policy "usuarios_select_no_escritorio"
  on public.usuarios
  for select
  using (
    (select auth.uid()) = id
    or (
      (select public.eh_chefe())
      and escritorio_id is not null
      and escritorio_id = (select public.meu_escritorio())
    )
  );

-- demandas
drop policy if exists "demandas_select_proprio_ou_chefe" on public.demandas;
drop policy if exists "demandas_insert_proprio" on public.demandas;
drop policy if exists "demandas_update_proprio_ou_chefe" on public.demandas;
drop policy if exists "demandas_delete_proprio_ou_chefe" on public.demandas;

create policy "demandas_select"
  on public.demandas for select
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

create policy "demandas_insert"
  on public.demandas for insert
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (select auth.uid()) = usuario_id
  );

create policy "demandas_update"
  on public.demandas for update
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  )
  with check (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

create policy "demandas_delete"
  on public.demandas for delete
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

-- listas
drop policy if exists "listas_select_proprio_ou_chefe" on public.listas;
drop policy if exists "listas_insert_proprio" on public.listas;
drop policy if exists "listas_update_proprio_ou_chefe" on public.listas;
drop policy if exists "listas_delete_proprio_ou_chefe" on public.listas;

create policy "listas_select"
  on public.listas for select
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

create policy "listas_insert"
  on public.listas for insert
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (select auth.uid()) = usuario_id
  );

create policy "listas_update"
  on public.listas for update
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  )
  with check (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

create policy "listas_delete"
  on public.listas for delete
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

-- comentarios
drop policy if exists "comentarios_select_dono_ou_chefe" on public.comentarios;
drop policy if exists "comentarios_insert_autor_dono_ou_chefe" on public.comentarios;

create policy "comentarios_select"
  on public.comentarios for select
  using (
    escritorio_id = (select public.meu_escritorio())
    and (
      (select public.eh_chefe())
      or exists (
        select 1 from public.demandas d
        where d.id = comentarios.demanda_id
          and d.usuario_id = (select auth.uid())
      )
    )
  );

create policy "comentarios_insert"
  on public.comentarios for insert
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (select auth.uid()) = usuario_id
    and (
      (select public.eh_chefe())
      or exists (
        select 1 from public.demandas d
        where d.id = demanda_id
          and d.usuario_id = (select auth.uid())
      )
    )
  );

-- notificacoes
drop policy if exists "notificacoes_select_proprio" on public.notificacoes;
drop policy if exists "notificacoes_update_proprio" on public.notificacoes;

create policy "notificacoes_select_proprio"
  on public.notificacoes for select
  using (
    (select auth.uid()) = usuario_id
    and escritorio_id = (select public.meu_escritorio())
  );

create policy "notificacoes_update_proprio"
  on public.notificacoes for update
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

-- ---------- 12. Triggers de notificação carregam o escritorio_id ----------
create or replace function public.notificar_novo_comentario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dono_id uuid;
  titulo_demanda text;
  esc_id uuid;
begin
  select usuario_id, titulo, escritorio_id
    into dono_id, titulo_demanda, esc_id
  from public.demandas where id = new.demanda_id;

  if dono_id is not null and dono_id is distinct from new.usuario_id then
    insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao, escritorio_id)
    values (
      dono_id, new.demanda_id, 'comentario',
      coalesce(new.autor_nome, 'Alguém') || ' comentou em "' || titulo_demanda || '"',
      esc_id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notificar_mudanca_demanda()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem uuid := (select auth.uid());
  quem_nome text;
begin
  if quem is null or quem is not distinct from old.usuario_id then
    return new;
  end if;

  select nome into quem_nome from public.usuarios where id = quem;
  quem_nome := coalesce(quem_nome, 'Alguém');

  if new.status is distinct from old.status then
    insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao, escritorio_id)
    values (old.usuario_id, new.id, 'status',
      'Status de "' || new.titulo || '" mudou para '
        || public.rotulo_status(new.status) || ' por ' || quem_nome,
      new.escritorio_id);
  elsif new.titulo is distinct from old.titulo
     or new.descricao is distinct from old.descricao
     or new.data_entrega is distinct from old.data_entrega
     or new.dificuldade is distinct from old.dificuldade then
    insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao, escritorio_id)
    values (old.usuario_id, new.id, 'edicao',
      'A demanda "' || new.titulo || '" foi editada por ' || quem_nome,
      new.escritorio_id);
  end if;

  return new;
end;
$$;
