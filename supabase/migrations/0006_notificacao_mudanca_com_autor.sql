-- Migration: incluir o nome de quem alterou nas notificações de status/edição.
-- Antes: 'A demanda "X" foi editada'
-- Agora:  'A demanda "X" foi editada por Gabriel'
-- (idem para status: '... mudou para Concluída por Gabriel')

create or replace function public.notificar_mudanca_demanda()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem uuid := (select auth.uid());
  quem_nome text;
begin
  -- Só notifica quando quem alterou não é o dono (ex.: um chefe).
  if quem is null or quem is not distinct from old.usuario_id then
    return new;
  end if;

  select nome into quem_nome from public.usuarios where id = quem;
  quem_nome := coalesce(quem_nome, 'Alguém');

  if new.status is distinct from old.status then
    insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao)
    values (old.usuario_id, new.id, 'status',
      'Status de "' || new.titulo || '" mudou para '
        || public.rotulo_status(new.status) || ' por ' || quem_nome);
  elsif new.titulo is distinct from old.titulo
     or new.descricao is distinct from old.descricao
     or new.data_entrega is distinct from old.data_entrega
     or new.dificuldade is distinct from old.dificuldade then
    insert into public.notificacoes (usuario_id, demanda_id, tipo, descricao)
    values (old.usuario_id, new.id, 'edicao',
      'A demanda "' || new.titulo || '" foi editada por ' || quem_nome);
  end if;

  return new;
end;
$$;
