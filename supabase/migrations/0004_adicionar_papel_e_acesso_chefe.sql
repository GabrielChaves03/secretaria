-- Migration: papéis de usuário (funcionario / chefe) e acesso ampliado do chefe.
-- O chefe enxerga e edita TODAS as demandas e comentários; o funcionário,
-- só os próprios. Quem é chefe é definido manualmente em public.usuarios.

alter table public.usuarios
  add column papel text not null default 'funcionario'
    check (papel in ('funcionario', 'chefe'));

-- O comentário guarda o nome de quem escreveu (desnormalizado): assim o dono
-- da demanda vê "Fulano comentou" sem precisar de acesso à linha do autor.
alter table public.comentarios
  add column autor_nome text;

-- Helper para as policies: o usuário logado é chefe?
-- SECURITY DEFINER roda como dono da tabela e ignora a RLS de usuarios,
-- evitando recursão infinita na própria policy de usuarios.
create function public.eh_chefe()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.usuarios
    where id = (select auth.uid()) and papel = 'chefe'
  );
$$;

-- ---- usuarios: o chefe pode ler todas as linhas (nome/telefone da equipe) ----
drop policy "usuarios_select_proprio" on public.usuarios;
create policy "usuarios_select_proprio_ou_chefe"
  on public.usuarios
  for select
  using ((select auth.uid()) = id or (select public.eh_chefe()));

-- ---- demandas: o chefe lê e edita todas; insert/delete continuam só do dono ----
drop policy "demandas_select_proprio" on public.demandas;
create policy "demandas_select_proprio_ou_chefe"
  on public.demandas
  for select
  using ((select auth.uid()) = usuario_id or (select public.eh_chefe()));

drop policy "demandas_update_proprio" on public.demandas;
create policy "demandas_update_proprio_ou_chefe"
  on public.demandas
  for update
  using ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  with check ((select auth.uid()) = usuario_id or (select public.eh_chefe()));

-- ---- comentarios: dono da demanda OU chefe ----
drop policy "comentarios_select_dono_da_demanda" on public.comentarios;
create policy "comentarios_select_dono_ou_chefe"
  on public.comentarios
  for select
  using (
    (select public.eh_chefe())
    or exists (
      select 1 from public.demandas d
      where d.id = comentarios.demanda_id
        and d.usuario_id = (select auth.uid())
    )
  );

drop policy "comentarios_insert_dono_da_demanda" on public.comentarios;
create policy "comentarios_insert_autor_dono_ou_chefe"
  on public.comentarios
  for insert
  with check (
    (select auth.uid()) = usuario_id
    and (
      (select public.eh_chefe())
      or exists (
        select 1 from public.demandas d
        where d.id = demanda_id
          and d.usuario_id = (select auth.uid())
      )
    )
  );
