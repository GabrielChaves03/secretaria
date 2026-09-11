@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Supabase - Configurar SMTP proprio (Gmail)

echo ============================================================
echo   CONFIGURAR SMTP PROPRIO (GMAIL) NO SUPABASE
echo ============================================================
echo.
echo Pre-requisitos (se ainda nao fez):
echo  1) Ative a verificacao em duas etapas em:
echo     https://myaccount.google.com/security
echo  2) Gere uma "senha de app" em:
echo     https://myaccount.google.com/apppasswords
echo     (nome sugerido: Secretaria Supabase)
echo.
echo A senha de app tem 16 caracteres. Ela fica so nesta janela,
echo nao e enviada pro chat nem gravada em nenhum arquivo.
echo.
set /p SUPABASE_AUTH_EMAIL_SMTP_PASS="Cole aqui a senha de app do Gmail e tecle Enter: "
echo.

echo --- Revisando o que vai mudar no projeto (fzxxlhqubtlgmrocmoxa) ---
call npx --yes supabase config diff
echo.
echo ============================================================
echo Confira a lista acima. O esperado:
echo  - auth.email.smtp.* (host/user/porta/etc) sendo criados
echo  - auth.email.smtp.enabled: false -^> true
echo  - auth.email.template.recovery.subject mudando de texto
echo    (o e-mail de redefinicao de senha agora aponta pra
echo    tela propria do app, /redefinir-senha)
echo  - auth.sms.twilio.enabled: true -^> false
echo    (SMS via Twilio estava "ligado" no projeto mas sem
echo    credencial nenhuma configurada, ou seja, nunca funcionou;
echo    desligar isso e so um ajuste de higiene, nao afeta o app)
echo Se tiver algo MUITO diferente disso, feche esta janela e
echo me avise no chat antes de continuar.
echo ============================================================
echo.
pause

echo --- Aplicando no Supabase ---
call npx --yes supabase config push --yes
echo.

echo ============================================================
echo  Pronto. Teste o "esqueci minha senha" no app pra confirmar
echo  que o e-mail chega. Se der erro de autenticacao SMTP, a
echo  causa mais comum e a senha de app errada/expirada - gere
echo  outra e rode este .bat de novo.
echo ============================================================
pause
