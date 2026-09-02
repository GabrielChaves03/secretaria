@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Secretaria - Gestao de Demandas

echo ============================================
echo   Secretaria - Gestao de Demandas Internas
echo ============================================
echo.
echo Iniciando o servidor... aguarde aparecer a
echo linha "Ready in ...".
echo.
echo O navegador abre sozinho em alguns segundos.
echo Se nao abrir, acesse: http://localhost:3000
echo.
echo Para PARAR: feche esta janela.
echo ============================================
echo.

rem abre o navegador depois de 12s, sem travar o servidor
start "" cmd /c "timeout /t 12 >nul & start http://localhost:3000"

call npm run dev

echo.
echo O servidor parou. Pressione uma tecla para fechar.
pause >nul
