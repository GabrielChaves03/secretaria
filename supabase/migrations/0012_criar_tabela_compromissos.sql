-- ============================================================
-- Compromissos: reuniões/agenda da pessoa, separado de `demandas`.
--
-- `data_hora` é timestamptz (data + HORA) — diferente de `demandas.data_entrega`
-- (só data), porque o lembrete futuro por WhatsApp (ainda não implementado)
-- precisa saber a que horas avisar. Mesmo padrão de escopo de `demandas`:
-- dono vê/edita o próprio, chefe vê/edita tudo do escritório.
-- ============================================================

create table public.compromissos (
  id            uuid        primary key default gen_random_uuid(),
  escritorio_id uuid        references public.escritorios (id) on delete cascade,
  usuario_id    uuid        not null references auth.users (id) on delete cascade,
  titulo        text        not null,
  descricao     text,
  data_hora     timestamptz not null,
  criado_em     timestamptz not null default now()
);

create index compromissos_usuario_id_idx on public.compromissos (usuario_id);
create index compromissos_data_hora_idx on public.compromissos (data_hora);

-- Regra do projeto: RLS SEMPRE ligado em tabela nova.
alter table public.compromissos enable row level security;

-- escritorio_id preenchido sozinho no insert (mesma função de demandas/listas).
create trigger compromissos_preenche_escritorio
  before insert on public.compromissos
  for each row execute function public.preencher_escritorio();

-- Dono vê/edita o próprio; chefe vê/edita tudo do escritório.
create policy "compromissos_select"
  on public.compromissos for select
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

create policy "compromissos_insert"
  on public.compromissos for insert
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (select auth.uid()) = usuario_id
  );

create policy "compromissos_update"
  on public.compromissos for update
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  )
  with check (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

create policy "compromissos_delete"
  on public.compromissos for delete
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );
