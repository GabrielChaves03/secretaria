-- ============================================================
-- Quadro ganhou a coluna "A iniciar" (30/09): o status 'pendente'
-- (demanda criada, ninguém começou) passa a se chamar "A iniciar" na UI.
-- "Pendentes" agora é só a coluna das atrasadas (derivada do prazo).
-- Atualiza o rótulo usado no texto das notificações do app.
-- ============================================================

create or replace function public.rotulo_status(s text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case s
    when 'pendente' then 'A iniciar'
    when 'em_andamento' then 'Em andamento'
    when 'concluida' then 'Concluída'
    else s
  end;
$$;
