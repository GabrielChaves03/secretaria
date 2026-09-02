@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Supabase - Aplicar mudancas no banco

echo ============================================================
echo   APLICAR MUDANCAS DE BANCO PENDENTES
echo ============================================================
echo.
echo Isso envia pro seu Supabase as migrations novas que o
echo Claude tiver criado na pasta supabase\migrations.
echo.
echo Se perguntar "Do you want to push these migrations? [Y/n]"
echo tecle Y e Enter.
echo.
pause
echo.

call npx --yes supabase db push

echo.
echo ============================================================
echo  Se apareceu "Finished supabase db push" acima, deu certo.
echo  Se apareceu erro, copie o texto e me mande no chat.
echo ============================================================
pause
