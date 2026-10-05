-- ============================================================
-- Fusão com o AvantPro — Fase B: status customizável.
--
-- O status deixa de ser um enum fixo (pendente/em_andamento/concluida) e
-- passa a ser texto livre, com o conjunto definido por escritório em
-- `escritorio_demandas_config.statuses` (padrão = os 4 do Avant).
-- "Concluído" é o status terminal (progresso/atraso levam isso em conta).
-- ============================================================

alter table public.demandas drop constraint if exists demandas_status_check;
alter table public.demandas alter column status set default 'A fazer';

-- Converte valores legados (hoje a tabela está vazia, mas por segurança).
update public.demandas set status = 'A fazer'      where status = 'pendente';
update public.demandas set status = 'Em Andamento' where status = 'em_andamento';
update public.demandas set status = 'Concluído'    where status = 'concluida';

-- rotulo_status agora é identidade: o status já é o próprio rótulo.
create or replace function public.rotulo_status(s text)
returns text
language sql
immutable
set search_path = ''
as $$ select s; $$;
