-- ============================================================
-- WhatsApp Fase 2: atribuição de demandas + avisos agendados.
--
-- 1. O CHEFE pode criar/reatribuir demanda para outro membro do PRÓPRIO
--    escritório (demandas.usuario_id = responsável). Funcionário continua
--    só criando/editando as próprias.
-- 2. Notificação no app do tipo 'atribuicao' (insert ou troca de dono).
-- 3. `escritorio_whatsapp.notif_compromisso` — toggle do lembrete de
--    compromisso.
-- 4. `whatsapp_avisos_enviados` — trava de "já avisei" dos avisos
--    agendados (prazo/compromisso), pra nunca mandar o mesmo duas vezes.
-- 5. pg_cron a cada 5 min chama /api/whatsapp/cron no app (mesmo padrão
--    Vault do ManyChat: segredo `manychat_cron_secret` = CRON_SECRET).
-- ============================================================

-- ---------- 1. Atribuição: RLS de demandas ----------

-- O alvo pertence ao escritório de quem está logado?
create function public.eh_membro_do_meu_escritorio(alvo uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.usuarios
    where id = alvo and escritorio_id = public.meu_escritorio()
  );
$$;

drop policy "demandas_insert" on public.demandas;
drop policy "demandas_update" on public.demandas;

create policy "demandas_insert"
  on public.demandas for insert
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (
      (select auth.uid()) = usuario_id
      or ((select public.eh_chefe()) and public.eh_membro_do_meu_escritorio(usuario_id))
    )
  );

create policy "demandas_update"
  on public.demandas for update
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  )
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (
      (select auth.uid()) = usuario_id
      or ((select public.eh_chefe()) and public.eh_membro_do_meu_escritorio(usuario_id))
    )
  );

-- ---------- 2. Notificação de atribuição ----------

alter table public.notificacoes drop constraint notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check
  check (tipo in ('comentario', 'status', 'edicao', 'atribuicao'));

-- Demanda criada por outra pessoa (chefe) já no nome do responsável.
create function public.notificar_atribuicao_demanda()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem uuid := (select auth.uid());
  quem_nome text;
begin
  if quem is null or quem is not distinct from new.usuario_id then
    return new;
  end if;

  select nome into quem_nome from public.usuarios where id = quem;

  insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao, escritorio_id)
  values (new.usuario_id, new.id, 'atribuicao',
    coalesce(quem_nome, 'Alguém') || ' atribuiu "' || new.titulo || '" a você',
    new.escritorio_id);

  return new;
end;
$$;

create trigger trg_notificar_atribuicao_demanda
  after insert on public.demandas
  for each row execute function public.notificar_atribuicao_demanda();

-- Mudança de demanda: agora trata primeiro a troca de responsável.
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
  if quem is null then
    return new;
  end if;

  select nome into quem_nome from public.usuarios where id = quem;
  quem_nome := coalesce(quem_nome, 'Alguém');

  -- Reatribuída: avisa só o novo responsável (se não foi ele mesmo).
  if new.usuario_id is distinct from old.usuario_id then
    if new.usuario_id is distinct from quem then
      insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao, escritorio_id)
      values (new.usuario_id, new.id, 'atribuicao',
        quem_nome || ' atribuiu "' || new.titulo || '" a você',
        new.escritorio_id);
    end if;
    return new;
  end if;

  if quem is not distinct from old.usuario_id then
    return new;
  end if;

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

-- ---------- 3. Toggle do lembrete de compromisso ----------

alter table public.escritorio_whatsapp
  add column notif_compromisso boolean not null default true;

-- ---------- 4. Trava de avisos agendados ----------

-- chave = "prazo:<demanda>:<amanha|hoje|atrasada>:<data>" ou
--         "compromisso:<id>:<data_hora>" — mudou a data, vira aviso novo.
create table public.whatsapp_avisos_enviados (
  chave          text        primary key,
  escritorio_id  uuid        references public.escritorios (id) on delete cascade,
  enviado_em     timestamptz not null default now()
);

-- Regra do projeto: RLS SEMPRE ligado. Sem policy de propósito: só o cron
-- (service role) lê/escreve aqui — nenhuma sessão de usuário precisa.
alter table public.whatsapp_avisos_enviados enable row level security;

-- ---------- 5. Agendamento (pg_cron + pg_net) ----------

select cron.schedule(
  'whatsapp-avisos-agendados',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://inspiring-genie-d3a1a7.netlify.app/api/whatsapp/cron?secret='
      || (select decrypted_secret from vault.decrypted_secrets where name = 'manychat_cron_secret'),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
