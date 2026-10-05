-- ============================================================
-- Planilhas (como no Avant) + aninhamento de quadros.
--
-- A Secretária passa a ser também de organização, não só demandas. Um quadro
-- pode ser do tipo 'planilha' (tabela de colunas/linhas livres) e pode ter um
-- quadro-pai (ex.: a planilha "Referências Criativos" fica dentro do Gomapet,
-- que no menu vira um nó expansível).
-- ============================================================

alter table public.quadros drop constraint if exists quadros_tipo_check;
alter table public.quadros add constraint quadros_tipo_check
  check (tipo in ('tarefas', 'anotacoes', 'planilha'));

-- Quadro-pai: quando preenchido, este quadro aparece aninhado sob o outro.
alter table public.quadros
  add column quadro_pai_id uuid references public.quadros (id) on delete cascade,
  add column planilha_colunas jsonb not null default '[]'::jsonb;
create index quadros_pai_id_idx on public.quadros (quadro_pai_id);

-- Linhas de uma planilha (valores = { colunaId: valor }).
create table public.planilha_linhas (
  id            uuid        primary key default gen_random_uuid(),
  escritorio_id uuid        references public.escritorios (id) on delete cascade,
  quadro_id     uuid        not null references public.quadros (id) on delete cascade,
  valores       jsonb       not null default '{}'::jsonb,
  ordem         integer     not null default 0,
  criado_em     timestamptz not null default now()
);
create index planilha_linhas_quadro_id_idx on public.planilha_linhas (quadro_id);

alter table public.planilha_linhas enable row level security;

create trigger planilha_linhas_preenche_escritorio
  before insert on public.planilha_linhas
  for each row execute function public.preencher_escritorio();

-- Planilha é compartilhada pelo escritório: qualquer membro vê e edita.
create policy "planilha_linhas_select" on public.planilha_linhas for select
  using (escritorio_id = (select public.meu_escritorio()));
create policy "planilha_linhas_insert" on public.planilha_linhas for insert
  with check (escritorio_id = (select public.meu_escritorio()));
create policy "planilha_linhas_update" on public.planilha_linhas for update
  using (escritorio_id = (select public.meu_escritorio()))
  with check (escritorio_id = (select public.meu_escritorio()));
create policy "planilha_linhas_delete" on public.planilha_linhas for delete
  using (escritorio_id = (select public.meu_escritorio()));
