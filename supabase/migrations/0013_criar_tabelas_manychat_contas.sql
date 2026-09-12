-- ============================================================
-- ManyChat (automação de DM do Instagram) — contas e automações
--
-- Porta o schema do app separado "ig-dm-automacao" pra dentro do Secretária,
-- multi-tenant de verdade: cada escritório conecta e gerencia sua própria
-- conta do Instagram, isolada por RLS (o app antigo não tinha RLS nenhuma —
-- só rodava via service role).
-- ============================================================

-- ------------------------------------------------------------
-- instagram_accounts: uma linha por conta do Instagram conectada
-- ------------------------------------------------------------
create table public.instagram_accounts (
  id                      uuid        primary key default gen_random_uuid(),
  escritorio_id           uuid        not null references public.escritorios (id) on delete cascade,
  ig_user_id              text        not null unique,
  ig_username             text,
  ig_profile_picture_url  text,
  access_token            text        not null,
  token_expires_at        timestamptz,
  connected_at            timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index instagram_accounts_escritorio_id_idx on public.instagram_accounts (escritorio_id);
create index instagram_accounts_ig_user_id_idx on public.instagram_accounts (ig_user_id);

alter table public.instagram_accounts enable row level security;

create policy "instagram_accounts_select"
  on public.instagram_accounts for select
  using (escritorio_id = (select public.meu_escritorio()));

-- INSERT/UPDATE só pela sessão normal do usuário (fluxo de OAuth), nunca
-- pelo cliente direto. A checagem de "essa conta já pertence a outro
-- escritório" acontece de graça: um upsert por ig_user_id (ON CONFLICT DO
-- UPDATE) numa linha de OUTRO escritório falha por violar a policy de
-- UPDATE abaixo (Postgres exige que a policy passe pra resolver o conflito).
create policy "instagram_accounts_insert"
  on public.instagram_accounts for insert
  with check (escritorio_id = (select public.meu_escritorio()));

create policy "instagram_accounts_update"
  on public.instagram_accounts for update
  using (escritorio_id = (select public.meu_escritorio()))
  with check (escritorio_id = (select public.meu_escritorio()));

-- ------------------------------------------------------------
-- automations: regras configuradas pelo usuário, presas a uma conta
-- ------------------------------------------------------------
create table public.automations (
  id                        uuid        primary key default gen_random_uuid(),
  escritorio_id             uuid        not null references public.escritorios (id) on delete cascade,
  instagram_account_id      uuid        not null references public.instagram_accounts (id) on delete cascade,
  name                      text        not null,
  active                    boolean     not null default true,

  trigger_comment           boolean     not null default false,
  trigger_story_reply       boolean     not null default false,
  trigger_dm                boolean     not null default false,

  keywords                  text[]      not null default '{}',
  match_type                text        not null default 'contains'
    check (match_type in ('contains', 'exact', 'any')),

  target_media_id           text,
  target_media_permalink    text,
  target_media_thumbnail_url text,

  public_replies            text[]      not null default '{}',

  dm_welcome_text           text,
  dm_quick_reply_label      text,

  link_message_text         text,
  link_button_label         text,
  link_url                  text,

  reminder_text             text,
  reminder_delay_minutes    integer     not null default 60,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index automations_escritorio_id_idx on public.automations (escritorio_id);
create index automations_account_idx on public.automations (instagram_account_id);
create index automations_active_idx on public.automations (active);
create index automations_target_media_idx on public.automations (target_media_id);

alter table public.automations enable row level security;

-- Qualquer membro do escritório gerencia as automações do próprio escritório.
-- A checagem extra (instagram_account_id precisa ser de uma conta do MESMO
-- escritório) evita apontar uma automação pra conta de outra empresa por
-- adivinhação de UUID — defesa em profundidade além do preenchimento
-- automático de escritorio_id pelo trigger.
create policy "automations_select"
  on public.automations for select
  using (escritorio_id = (select public.meu_escritorio()));

create policy "automations_insert"
  on public.automations for insert
  with check (
    escritorio_id = (select public.meu_escritorio())
    and exists (
      select 1 from public.instagram_accounts ia
      where ia.id = instagram_account_id and ia.escritorio_id = (select public.meu_escritorio())
    )
  );

create policy "automations_update"
  on public.automations for update
  using (escritorio_id = (select public.meu_escritorio()))
  with check (
    escritorio_id = (select public.meu_escritorio())
    and exists (
      select 1 from public.instagram_accounts ia
      where ia.id = instagram_account_id and ia.escritorio_id = (select public.meu_escritorio())
    )
  );

create policy "automations_delete"
  on public.automations for delete
  using (escritorio_id = (select public.meu_escritorio()));

create trigger automations_preenche_escritorio
  before insert on public.automations
  for each row execute function public.preencher_escritorio();

create function public.automations_atualiza_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger automations_toca_atualizado_em
  before update on public.automations
  for each row execute function public.automations_atualiza_timestamp();

-- ------------------------------------------------------------
-- followups: sequência de envio derivada de uma automação (link → lembrete)
-- ------------------------------------------------------------
create table public.followups (
  id             uuid        primary key default gen_random_uuid(),
  escritorio_id  uuid        not null references public.escritorios (id) on delete cascade,
  automation_id  uuid        not null references public.automations (id) on delete cascade,
  step           integer     not null,
  kind           text        not null check (kind in ('link', 'reminder')),
  delay_minutes  integer     not null default 0,
  message_text   text,
  button_label   text,
  button_url     text,
  created_at     timestamptz not null default now(),
  unique (automation_id, step)
);

create index followups_escritorio_id_idx on public.followups (escritorio_id);
create index followups_automation_idx on public.followups (automation_id);

alter table public.followups enable row level security;

create policy "followups_select"
  on public.followups for select
  using (escritorio_id = (select public.meu_escritorio()));

create policy "followups_insert"
  on public.followups for insert
  with check (escritorio_id = (select public.meu_escritorio()));

create policy "followups_delete"
  on public.followups for delete
  using (escritorio_id = (select public.meu_escritorio()));

-- escritorio_id herdado da automação (não do usuário logado — mesma ideia
-- de preencher_escritorio_comentario() na migration 0009, que herda da
-- demanda em vez de usar meu_escritorio() diretamente).
create function public.preencher_escritorio_followup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.escritorio_id := (
    select escritorio_id from public.automations where id = new.automation_id
  );
  return new;
end;
$$;

create trigger followups_preenche_escritorio
  before insert on public.followups
  for each row execute function public.preencher_escritorio_followup();
