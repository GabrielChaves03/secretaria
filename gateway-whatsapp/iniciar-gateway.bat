@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Nitro - Gateway de WhatsApp

if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)
if not exist .env (
  echo Falta o arquivo .env - copie o .env.example para .env e preencha o GATEWAY_TOKEN.
  pause
  exit /b 1
)

for /f "tokens=1,* delims==" %%a in ('findstr /b "GATEWAY_TOKEN=" .env') do set TOKEN=%%b
start "" "http://localhost:3333/?token=%TOKEN%"

echo ============================================================
echo   Gateway de WhatsApp rodando. Deixe esta janela aberta.
echo   Para parear: escaneie o QR na pagina que abriu no navegador.
echo ============================================================
node index.mjs
pause
