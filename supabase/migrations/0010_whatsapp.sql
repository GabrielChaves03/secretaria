-- ============================================================
-- WhatsApp: integração por escritório + preferência pessoal.
--
-- - `usuarios.whatsapp_ativo`: cada pessoa liga/desliga os avisos que
--   chegam no PRÓPRIO WhatsApp (edita o número em `usuarios.telefone`).
-- - `escritorio_whatsapp`: o CHEFE configura o gateway (URL + token) e
--   quais eventos disparam mensagem. Um por escritório.
--
-- O envio em si é feito pela camada de app (server actions) — nada de
-- HTTP no banco nesta versão.
-- ============================================================

-- Preferência pessoal (qualquer usuário edita a própria).
alter table public.usuarios
  add column whatsapp_ativo boolean not null default true;

-- Configuração do gateway, por escritório.
create table public.escritorio_whatsapp (
  escritorio_id     uuid        primary key references public.escritorios (id) on delete cascade,
  ativo             boolean     not null default false,
  endpoint_url      text,
  token             text,
  notif_atribuicao  boolean     not null default true,
  notif_status      boolean     not null default true,
  notif_comentario  boolean     not null default true,
  notif_prazo       boolean     not null default true,
  atualizado_em     timestamptz not null default now()
);

alter table public.escritorio_whatsapp enable row level security;

-- Ler: qualquer membro do escritório (a UI só mostra os campos ao chefe).
-- Escrever: só o chefe do escritório.
create policy "escritorio_whatsapp_select_membro"
  on public.escritorio_whatsapp for select
  using (escritorio_id = (select public.meu_escritorio()));

create policy "escritorio_whatsapp_insert_chefe"
  on public.escritorio_whatsapp for insert
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (select public.eh_chefe())
  );

create policy "escritorio_whatsapp_update_chefe"
  on public.escritorio_whatsapp for update
  using (
    escritorio_id = (select public.meu_escritorio())
    and (select public.eh_chefe())
  )
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (select public.eh_chefe())
  );

create policy "escritorio_whatsapp_delete_chefe"
  on public.escritorio_whatsapp for delete
  using (
    escritorio_id = (select public.meu_escritorio())
    and (select public.eh_chefe())
  );
