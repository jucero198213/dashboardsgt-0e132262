@echo off
REM ═══════════════════════════════════════════════════════════════
REM  Instala a Automacao MB como servico Windows via NSSM
REM  Executar como Administrador!
REM ═══════════════════════════════════════════════════════════════

set SERVICE_NAME=AutomacaoMB
set APP_DIR=%~dp0..

REM Detecta o Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado no PATH
    pause
    exit /b 1
)
for /f "delims=" %%i in ('where node') do set NODE_PATH=%%i

REM Detecta o NSSM
where nssm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: NSSM nao encontrado no PATH
    echo Baixe em https://nssm.cc/download e coloque nssm.exe no PATH
    pause
    exit /b 1
)

echo.
echo ══════════════════════════════════════════════
echo   Instalando servico: %SERVICE_NAME%
echo   Node: %NODE_PATH%
echo   Diretorio: %APP_DIR%
echo ══════════════════════════════════════════════
echo.

REM Remove servico antigo se existir
nssm stop %SERVICE_NAME% >nul 2>&1
nssm remove %SERVICE_NAME% confirm >nul 2>&1

REM Instala o servico
nssm install %SERVICE_NAME% "%NODE_PATH%" index.js
nssm set %SERVICE_NAME% AppDirectory "%APP_DIR%"
nssm set %SERVICE_NAME% Description "Automacao de baixa Martin Brower - SGT Log"
nssm set %SERVICE_NAME% Start SERVICE_AUTO_START

REM Logs - salva stdout e stderr em arquivos
nssm set %SERVICE_NAME% AppStdout "%APP_DIR%\logs\service-stdout.log"
nssm set %SERVICE_NAME% AppStderr "%APP_DIR%\logs\service-stderr.log"
nssm set %SERVICE_NAME% AppStdoutCreationDisposition 4
nssm set %SERVICE_NAME% AppStderrCreationDisposition 4
nssm set %SERVICE_NAME% AppRotateFiles 1
nssm set %SERVICE_NAME% AppRotateOnline 1
nssm set %SERVICE_NAME% AppRotateBytes 5242880

REM Reinicia automaticamente em caso de falha
nssm set %SERVICE_NAME% AppExit Default Restart
nssm set %SERVICE_NAME% AppRestartDelay 30000

REM Cria pasta de logs se nao existir
if not exist "%APP_DIR%\logs" mkdir "%APP_DIR%\logs"

REM Inicia o servico
nssm start %SERVICE_NAME%

echo.
echo ══════════════════════════════════════════════
echo   Servico %SERVICE_NAME% instalado e iniciado!
echo.
echo   Comandos uteis:
echo     nssm status AutomacaoMB
echo     nssm stop AutomacaoMB
echo     nssm start AutomacaoMB
echo     nssm restart AutomacaoMB
echo     nssm remove AutomacaoMB confirm
echo ══════════════════════════════════════════════
echo.
pause
