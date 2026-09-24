-- ============================================================
-- Deploy oficial migrou da Netlify para a Vercel (24/09): a conta da
-- Netlify estourou os créditos do plano grátis em 13/09 e parou de
-- publicar. Reagenda o cron dos avisos de WhatsApp (0016) para a URL da
-- Vercel — `cron.schedule` com o mesmo nome substitui o job existente.
-- Os crons do ManyChat já apontavam para a Vercel desde 14/09.
-- ============================================================

select cron.schedule(
  'whatsapp-avisos-agendados',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://secretaria-chaves5.vercel.app/api/whatsapp/cron?secret='
      || (select decrypted_secret from vault.decrypted_secrets where name = 'manychat_cron_secret'),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
