-- ============================================================
-- Aparência: fundo de tela pessoal (estilo "capa" do Notion).
--
-- `usuarios.imagem_fundo`: chave de uma imagem pré-definida (ver
-- src/lib/aparencia.ts) — cada usuário escolhe a sua, em /ajustes. NULL usa
-- o fundo padrão. Guardamos só a chave (não a URL), então trocar o caminho
-- do arquivo no futuro não exige migração de dado.
--
-- Sem policy nova: a regra "usuarios_update_proprio" (0001) já cobre, e o
-- trigger usuarios_guard (0009) só trava papel/escritorio_id — esta coluna
-- fica livre pro próprio usuário editar, como telefone/whatsapp_ativo.
-- ============================================================

alter table public.usuarios
  add column imagem_fundo text;
