-- ============================================================
-- Colunas das demandas POR QUADRO (cada quadro de tarefas é único).
--
-- `quadros.colunas_demandas` guarda a lista completa de colunas daquele quadro
-- (as de sistema — Responsável/Status/Prazo/Prioridade/Notas/Link — com nome,
-- visibilidade e ordem próprios, mais as personalizadas). NULL = quadro ainda
-- não personalizado → o app usa as colunas padrão.
-- Os valores das colunas personalizadas continuam em `demandas.campos[id]`.
--
-- A RLS de `quadros` só deixa o chefe escrever; para QUALQUER membro poder
-- personalizar as colunas, a escrita passa por esta função SECURITY DEFINER,
-- restrita ao escritório de quem chamou e só ao campo de colunas.
-- ============================================================

alter table public.quadros
  add column colunas_demandas jsonb;

create or replace function public.salvar_colunas_quadro(
  p_quadro  uuid,
  p_colunas jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(p_colunas) <> 'array' or jsonb_array_length(p_colunas) > 60 then
    raise exception 'Colunas inválidas.';
  end if;

  update public.quadros
     set colunas_demandas = p_colunas
   where id = p_quadro
     and tipo = 'tarefas'
     and escritorio_id = public.meu_escritorio();

  if not found then
    raise exception 'Quadro não encontrado.';
  end if;
end;
$$;

revoke all on function public.salvar_colunas_quadro(uuid, jsonb) from public, anon;
grant execute on function public.salvar_colunas_quadro(uuid, jsonb) to authenticated;

-- Colunas personalizadas no nível do escritório (testadas em 15/10) deixam de
-- existir: o escritório guarda só as de sistema (padrão para quadros novos).
update public.escritorio_demandas_config
   set colunas = coalesce(
     (select jsonb_agg(c) from jsonb_array_elements(colunas) c
       where coalesce((c->>'sistema')::boolean, false)),
     '[]'::jsonb
   );
