@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Supabase - Configuracao inicial (rodar so uma vez)

echo ============================================================
echo   CONFIGURACAO INICIAL DO SUPABASE CLI  (rodar uma vez so)
echo ============================================================
echo.
echo O que vai acontecer:
echo.
echo  1) Abre o navegador para voce logar no Supabase.
echo     -^> clique em "Authorize" / "Autorizar".
echo.
echo  2) Aqui nesta janela vai pedir a SENHA DO BANCO.
echo     -^> cole a senha e tecle Enter.
echo     (se nao souber: Supabase ^> Settings ^> Database ^>
echo      "Reset database password" ^> gera uma e guarda)
echo.
echo  A primeira vez baixa o programa (uns segundos). Se
echo  perguntar "Ok to proceed?", tecle Y e Enter.
echo.
pause
echo.

echo --- [1/2] Login ---
call npx --yes supabase login
echo.

echo --- [2/2] Conectando este projeto ---
call npx --yes supabase link --project-ref fzxxlhqubtlgmrocmoxa
echo.

echo ============================================================
echo  Se nao apareceu ERRO em vermelho acima, esta conectado.
echo  Proximo passo: me avise aqui no chat que eu te guio a
echo  sincronizar as migrations que ja existem.
echo ============================================================
pause
