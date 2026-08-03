@echo off
title Automacao MB - SGT Log
color 0A
echo.
echo  ================================================
echo   AUTOMACAO DE BAIXA - MARTIN BROWER
echo  ================================================
echo.

cd /d "C:\Users\SGT LOG\Desktop\Nova pasta\Workspace-SGT\dw-automacao-mb"

"C:\Program Files\nodejs\node.exe" index.js

echo.
echo  ================================================
echo   AUTOMACAO ENCERRADA - veja o erro acima
echo  ================================================
echo.
pause
