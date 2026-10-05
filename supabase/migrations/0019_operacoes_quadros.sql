-- ============================================================
-- Fusão com o AvantPro — Fase A: Operações → Quadros.
--
-- Traz do Avant a organização em dois níveis acima das demandas:
--   Operação (pasta) → Quadro (board) → grupos → demandas.
-- Aditivo: NÃO mexe no status ainda (isso vem na 0020, junto do board novo).
-- Toda demanda existente é movida para uma Operação/Quadro "Geral".
-- ============================================================

-- ---------- Operações (as "pastas" do Avant) ----------
create table public.operacoes (
  id            uuid        primary key default gen_random_uuid(),
  escritorio_id uuid        references public.escritorios (id) on delete cascade,
  nome          text        not null,
  cor           text        not null default '#579BFC',
  ordem         integer     not null default 0,
  criado_em     timestamptz not null default now()
);
create index operacoes_escritorio_id_idx on public.operacoes (escritorio_id);

alter table public.operacoes enable row level security;

create trigger operacoes_preenche_escritorio
  before insert on public.operacoes
  for each row execute function public.preencher_escritorio();

-- Ler: qualquer membro do escritório. Escrever: só o chefe.
create policy "operacoes_select" on public.operacoes for select
  using (escritorio_id = (select public.meu_escritorio()));
create policy "operacoes_insert" on public.operacoes for insert
  with check (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()));
create policy "operacoes_update" on public.operacoes for update
  using (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()))
  with check (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()));
create policy "operacoes_delete" on public.operacoes for delete
  using (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()));

-- ---------- Quadros (os "boards" do Avant) ----------
create table public.quadros (
  id             uuid        primary key default gen_random_uuid(),
  escritorio_id  uuid        references public.escritorios (id) on delete cascade,
  operacao_id    uuid        not null references public.operacoes (id) on delete cascade,
  nome           text        not null,
  cor            text        not null default '#579BFC',
  tipo           text        not null default 'tarefas' check (tipo in ('tarefas', 'anotacoes')),
  ordem          integer     not null default 0,
  primeiro_grupo text        not null default 'Tarefas pendentes',
  grupos_ordem   jsonb       not null default '[]'::jsonb,
  grupos_cores   jsonb       not null default '{}'::jsonb,
  criado_em      timestamptz not null default now()
);
create index quadros_operacao_id_idx on public.quadros (operacao_id);
create index quadros_escritorio_id_idx on public.quadros (escritorio_id);

alter table public.quadros enable row level security;

create trigger quadros_preenche_escritorio
  before insert on public.quadros
  for each row execute function public.preencher_escritorio();

create policy "quadros_select" on public.quadros for select
  using (escritorio_id = (select public.meu_escritorio()));
create policy "quadros_insert" on public.quadros for insert
  with check (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()));
create policy "quadros_update" on public.quadros for update
  using (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()))
  with check (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()));
create policy "quadros_delete" on public.quadros for delete
  using (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()));

-- ---------- Config de demandas por escritório (statuses + colunas) ----------
-- Mesma ideia do `config` global do Avant, mas por escritório. Os status são
-- customizáveis (nome/cor/ordem); as colunas de sistema podem ser ligadas/
-- desligadas e dá pra criar colunas personalizadas.
create table public.escritorio_demandas_config (
  escritorio_id uuid        primary key references public.escritorios (id) on delete cascade,
  statuses      jsonb       not null default '["A fazer","Em Andamento","Falta Revisar","Concluído"]'::jsonb,
  status_cores  jsonb       not null default '{"A fazer":"#C4C4C4","Em Andamento":"#579BFC","Falta Revisar":"#FDAB3D","Concluído":"#00C875"}'::jsonb,
  colunas       jsonb       not null default '[
    {"id":"responsavel","nome":"Responsável","tipo":"pessoa","ativo":true,"sistema":true},
    {"id":"status","nome":"Status","tipo":"status","ativo":true,"sistema":true},
    {"id":"prazo","nome":"Prazo","tipo":"data","ativo":true,"sistema":true},
    {"id":"prioridade","nome":"Prioridade","tipo":"prioridade","ativo":true,"sistema":true},
    {"id":"notas","nome":"Notas","tipo":"texto","ativo":true,"sistema":true},
    {"id":"link","nome":"Link","tipo":"link","ativo":true,"sistema":true}
  ]'::jsonb,
  show_summary  boolean     not null default true,
  atualizado_em timestamptz not null default now()
);

alter table public.escritorio_demandas_config enable row level security;

create policy "demandas_config_select" on public.escritorio_demandas_config for select
  using (escritorio_id = (select public.meu_escritorio()));
create policy "demandas_config_insert" on public.escritorio_demandas_config for insert
  with check (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()));
create policy "demandas_config_update" on public.escritorio_demandas_config for update
  using (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()))
  with check (escritorio_id = (select public.meu_escritorio()) and (select public.eh_chefe()));

-- ---------- Demandas: campos novos do board (sem tocar no status) ----------
alter table public.demandas
  add column quadro_id  uuid references public.quadros (id) on delete cascade,
  add column grupo      text,
  add column prioridade text,
  add column link       text,
  add column campos     jsonb not null default '{}'::jsonb;
create index demandas_quadro_id_idx on public.demandas (quadro_id);

-- ---------- Backfill: tudo que já existe entra num "Geral" ----------
do $$
declare
  e      record;
  op_id  uuid;
  q_id   uuid;
begin
  for e in select id from public.escritorios loop
    insert into public.escritorio_demandas_config (escritorio_id)
      values (e.id) on conflict do nothing;

    insert into public.operacoes (escritorio_id, nome, cor, ordem)
      values (e.id, 'Geral', '#579BFC', 0)
      returning id into op_id;

    insert into public.quadros (escritorio_id, operacao_id, nome, cor, ordem, primeiro_grupo)
      values (e.id, op_id, 'Geral', '#00CA72', 0, 'Tarefas pendentes')
      returning id into q_id;

    update public.demandas
      set quadro_id = q_id,
          grupo = coalesce(grupo, 'Tarefas pendentes')
      where escritorio_id = e.id and quadro_id is null;
  end loop;
end $$;
