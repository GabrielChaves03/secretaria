-- ============================================================
-- Cor escolhível para valores de seleção na planilha.
--
-- As cores ficam na própria coluna (`planilha_colunas[i].cores = {valor: cor}`),
-- que mora em `quadros` (escrita só do chefe pela RLS). Para QUALQUER membro
-- poder trocar a cor de um valor, esta função SECURITY DEFINER atualiza só o
-- mapa de cores, restrita ao escritório da pessoa.
-- ============================================================

create or replace function public.definir_cor_valor_planilha(
  p_quadro  uuid,
  p_coluna  text,
  p_valor   text,
  p_cor     text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cols   jsonb;
  col    jsonb;
  novas  jsonb := '[]'::jsonb;
begin
  -- Só mexe se o quadro é do escritório de quem chamou.
  if not exists (
    select 1 from public.quadros
    where id = p_quadro and escritorio_id = public.meu_escritorio()
  ) then
    return;
  end if;

  select planilha_colunas into cols from public.quadros where id = p_quadro;
  if cols is null then return; end if;

  for col in select * from jsonb_array_elements(cols) loop
    if col->>'id' = p_coluna then
      col := jsonb_set(
        col,
        '{cores}',
        coalesce(col->'cores', '{}'::jsonb) || jsonb_build_object(p_valor, p_cor)
      );
    end if;
    novas := novas || col;
  end loop;

  update public.quadros set planilha_colunas = novas where id = p_quadro;
end;
$$;
