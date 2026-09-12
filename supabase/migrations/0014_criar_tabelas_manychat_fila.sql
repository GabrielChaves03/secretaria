-- ============================================================
-- ManyChat — contatos, fila de envio e log de eventos
--
-- Diferente de `instagram_accounts`/`automations`/`followups` (escritas pela
-- sessão normal do usuário no painel), estas 3 tabelas só são escritas pelo
-- motor (webhook/drenador/cron), que roda com a service role key — sem
-- sessão de usuário nenhuma. Por isso `escritorio_id` aqui é preenchido
-- explicitamente pelo código (não por trigger baseado em meu_escritorio(),
-- que não existe fora de uma sessão logada), e a RLS só cobre SELECT (uso
-- futuro do painel; INSERT/UPDATE continuam exclusivos da service role, que
-- ignora RLS).
-- ============================================================

-- ------------------------------------------------------------
-- contacts: pessoas que já interagiram, por conta do Instagram
-- ------------------------------------------------------------
create table public.contacts (
  id                    uuid        primary key default gen_random_uuid(),
  escritorio_id         uuid        not null references public.escritorios (id) on delete cascade,
  instagram_account_id  uuid        not null references public.instagram_accounts (id) on delete cascade,
  ig_scoped_id          text        not null,
  ig_username           text,
  first_contact_at      timestamptz not null default now(),
  last_reply_at         timestamptz, -- abre a janela de 24h
  last_automation_id    uuid        references public.automations (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index contacts_account_scoped_id_idx on public.contacts (instagram_account_id, ig_scoped_id);
create index contacts_escritorio_id_idx on public.contacts (escritorio_id);
create index contacts_last_reply_idx on public.contacts (last_reply_at);

alter table public.contacts enable row level security;

create policy "contacts_select"
  on public.contacts for select
  using (escritorio_id = (select public.meu_escritorio()));

-- ------------------------------------------------------------
-- queue: fila de envio com trava atômica (global — um único drenador
-- atende a fila de todos os escritórios de uma vez)
-- ------------------------------------------------------------
create table public.queue (
  id             uuid        primary key default gen_random_uuid(),
  escritorio_id  uuid        not null references public.escritorios (id) on delete cascade,
  contact_id     uuid        not null references public.contacts (id) on delete cascade,
  automation_id  uuid        references public.automations (id) on delete set null,
  followup_id    uuid        references public.followups (id) on delete set null,

  kind           text        not null check (kind in ('private_reply', 'dm_welcome', 'link', 'reminder', 'public_reply')),

  recipient_type text        not null check (recipient_type in ('comment_id', 'id')),
  recipient_value text       not null,
  message_text   text,
  button_label   text,
  button_url     text,
  quick_reply_label text,

  bypasses_24h_window boolean not null default false,

  available_at   timestamptz not null default now(),
  expires_at     timestamptz,

  status         text        not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  claimed_at     timestamptz,
  sent_at        timestamptz,
  attempts       integer     not null default 0,
  last_error     text,

  dedupe_key     text unique,

  created_at     timestamptz not null default now()
);

create index queue_status_available_idx on public.queue (status, available_at);
create index queue_contact_idx on public.queue (contact_id);
create index queue_escritorio_id_idx on public.queue (escritorio_id);

alter table public.queue enable row level security;

create policy "queue_select"
  on public.queue for select
  using (escritorio_id = (select public.meu_escritorio()));

-- Reivindica um lote da fila de forma atômica (evita envio em dobro quando
-- o drenador é chamado ao mesmo tempo pelo webhook e pelo pg_cron).
-- Global de propósito: não filtra por escritório, atende todos de uma vez.
create function public.claim_queue_batch(p_batch_size int)
returns setof public.queue
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.queue
  set status = 'skipped'
  where status = 'pending'
    and expires_at is not null
    and expires_at <= now();

  return query
  update public.queue q
  set status = 'sending',
      claimed_at = now(),
      attempts = attempts + 1
  where q.id in (
    select id from public.queue
    where status = 'pending'
      and available_at <= now()
    order by available_at asc
    for update skip locked
    limit p_batch_size
  )
  returning q.*;
end;
$$;

-- ------------------------------------------------------------
-- events: log bruto de tudo que chega da Meta
-- ------------------------------------------------------------
create table public.events (
  id              uuid        primary key default gen_random_uuid(),
  escritorio_id   uuid        references public.escritorios (id) on delete cascade,
  event_type      text        not null,
  ig_scoped_id    text,
  raw_payload     jsonb       not null,
  processed       boolean     not null default false,
  processing_note text,
  received_at     timestamptz not null default now()
);

create index events_received_at_idx on public.events (received_at desc);
create index events_processed_idx on public.events (processed);
create index events_escritorio_id_idx on public.events (escritorio_id);

alter table public.events enable row level security;

create policy "events_select"
  on public.events for select
  using (escritorio_id = (select public.meu_escritorio()));
