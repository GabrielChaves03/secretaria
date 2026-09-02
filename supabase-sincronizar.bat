@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Supabase - Sincronizar migrations existentes (rodar so uma vez)

echo ============================================================
echo   SINCRONIZAR MIGRATIONS JA APLICADAS  (rodar uma vez so)
echo ============================================================
echo.
echo As migrations 0001 a 0005 ja estao no banco (foram
echo aplicadas pelo SQL Editor). Isso avisa o CLI que elas
echo ja estao feitas, pra ele parar de tentar criar de novo.
echo.
echo Se pedir a senha do banco, cole e de Enter.
echo.
pause
echo.

call npx --yes supabase migration repair --status applied 0001
call npx --yes supabase migration repair --status applied 0002
call npx --yes supabase migration repair --status applied 0003
call npx --yes supabase migration repair --status applied 0004
call npx --yes supabase migration repair --status applied 0005

echo.
echo --- Conferindo estado ---
call npx --yes supabase migration list

echo.
echo ============================================================
echo  Se na lista acima as 5 migrations aparecem com data nas
echo  colunas LOCAL e REMOTE (alinhadas), esta sincronizado.
echo  Daqui pra frente use so o supabase-aplicar.bat.
echo ============================================================
pause
