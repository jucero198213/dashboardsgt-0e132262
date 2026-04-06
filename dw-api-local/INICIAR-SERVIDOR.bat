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
    echo.
    pause
    exit /b 1
)

echo  Node.js encontrado:
node --version
echo.

:: Instala dependências se node_modules não existir
IF NOT EXIST "node_modules" (
    echo  Instalando dependencias pela primeira vez...
    echo.
    npm install
    IF %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [ERRO] Falha no npm install!
        pause
        exit /b 1
    )
    echo.
    echo  Dependencias instaladas com sucesso!
    echo.
)

echo  Iniciando servidor na porta 3001...
echo  Pressione CTRL+C para parar.
echo  ------------------------------------------------
echo.

node server.js

echo.
echo  ================================================
echo   SERVIDOR ENCERRADO - veja o erro acima
echo  ================================================
echo.
pause
