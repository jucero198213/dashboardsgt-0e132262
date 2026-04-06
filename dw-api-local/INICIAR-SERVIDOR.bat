@echo off
title DW API Local - SGT
color 0A
echo.
echo  ================================================
echo   DW API LOCAL - INTELIGENCIA FINANCEIRA SGT
echo  ================================================
echo.

:: Verifica se Node.js está instalado
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo  [ERRO] Node.js nao encontrado!
    echo  Baixe em: https://nodejs.org
    pause
    exit /b 1
)

:: Instala dependências se node_modules não existir
IF NOT EXIST "node_modules" (
    echo  Instalando dependencias pela primeira vez...
    npm install
    echo.
)

echo  Iniciando servidor na porta 3001...
echo  Pressione CTRL+C para parar.
echo.
node server.js

pause
