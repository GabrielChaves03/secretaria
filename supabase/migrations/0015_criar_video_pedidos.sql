-- ============================================================
-- Editor de Vídeos — fila manual de pedidos de edição
--
-- Cada escritório envia um vídeo bruto + instruções extras. O agente de
-- edição (video-use + HyperFrames) hoje só roda manualmente pelo Claude Code
-- na máquina do admin, sem servidor — então não existe automação aqui: o
-- status só muda pelo painel de admin (service role, ver
-- src/app/editor-de-videos/actions.ts), por isso esta tabela NASCE sem
-- policy de UPDATE para a sessão normal do usuário.
-- ============================================================

create table public.video_pedidos (
  id                   uuid        primary key default gen_random_uuid(),
  escritorio_id        uuid        not null references public.escritorios (id) on delete cascade,
  usuario_id           uuid        not null references public.usuarios (id) on delete cascade,
  nome_arquivo         text        not null,
  instrucoes           text,
  status               text        not null default 'pendente'
    check (status in ('pendente', 'em_edicao', 'concluido')),
  video_original_path  text        not null,
  video_editado_path   text,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);

create index video_pedidos_escritorio_id_idx on public.video_pedidos (escritorio_id);
create index video_pedidos_status_idx on public.video_pedidos (status);

alter table public.video_pedidos enable row level security;

-- Funcionário vê só os próprios pedidos; chefe vê os do escritório inteiro
-- (mesmo padrão de demandas_select, migration 0009).
create policy "video_pedidos_select"
  on public.video_pedidos for select
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

create policy "video_pedidos_insert"
  on public.video_pedidos for insert
  with check (
    escritorio_id = (select public.meu_escritorio())
    and (select auth.uid()) = usuario_id
  );

-- Cancelar/limpar um pedido (dono ou chefe) — apaga a linha; os arquivos no
-- Storage são removidos à parte pela Server Action (apagarPedidoVideo).
create policy "video_pedidos_delete"
  on public.video_pedidos for delete
  using (
    escritorio_id = (select public.meu_escritorio())
    and ((select auth.uid()) = usuario_id or (select public.eh_chefe()))
  );

-- Sem policy de UPDATE de propósito: só o admin muda status/anexa o vídeo
-- editado, via supabaseAdmin() (service role, ignora RLS).

create trigger video_pedidos_preenche_escritorio
  before insert on public.video_pedidos
  for each row execute function public.preencher_escritorio();

create function public.video_pedidos_atualiza_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger video_pedidos_toca_atualizado_em
  before update on public.video_pedidos
  for each row execute function public.video_pedidos_atualiza_timestamp();

-- ------------------------------------------------------------
-- Storage: bucket privado, isolado por pasta = escritorio_id.
-- Limite de arquivo bem acima do padrão do projeto (50MiB) porque vídeo bruto
-- costuma passar disso — se o plano do Supabase tiver um teto menor que este,
-- o upload falha com erro do próprio Storage (nada a fazer por SQL nesse caso,
-- só checar em Studio → Settings → Storage).
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos-pedidos',
  'videos-pedidos',
  false,
  2147483648, -- 2 GiB
  array['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/x-msvideo']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Isolamento por escritório: 1º segmento do caminho do objeto precisa ser o
-- escritorio_id de quem está logado. Não checa dono/chefe no nível do
-- Storage (só a tabela video_pedidos checa isso) — colegas do mesmo
-- escritório podem apagar o arquivo um do outro diretamente pela Storage API,
-- risco aceito (mesmo nível de confiança que já existe entre colegas no
-- quadro de demandas).
create policy "videos_pedidos_select"
  on storage.objects for select
  using (
    bucket_id = 'videos-pedidos'
    and (storage.foldername(name))[1] = (select public.meu_escritorio())::text
  );

create policy "videos_pedidos_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'videos-pedidos'
    and (storage.foldername(name))[1] = (select public.meu_escritorio())::text
  );

create policy "videos_pedidos_delete"
  on storage.objects for delete
  using (
    bucket_id = 'videos-pedidos'
    and (storage.foldername(name))[1] = (select public.meu_escritorio())::text
  );
