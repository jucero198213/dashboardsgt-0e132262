@echo off
title Automacao de Baixa - SGT Log
color 0A
echo.
echo  ================================================
echo   AUTOMACAO DE BAIXA - MB, PLATLOG
echo  ================================================
echo.

cd /d "C:\Users\SGT LOG\Desktop\Nova pasta\Workspace-SGT\dw-automacao-mb"

if not exist "logs" mkdir logs

echo  Logs em: logs\service-stdout.log
echo  Pressione CTRL+C para parar.
echo  ------------------------------------------------
echo.

"C:\Program Files\nodejs\node.exe" index.js >> logs\service-stdout.log 2>> logs\service-stderr.log

echo.
echo  ================================================
echo   AUTOMACAO ENCERRADA - veja logs\service-stdout.log
echo  ================================================
echo.
pause
