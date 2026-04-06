@echo off
title Cloudflare Tunnel - DW API
color 0B
echo.
echo  ================================================
echo   CLOUDFLARE TUNNEL - DW API LOCAL
echo  ================================================
echo.

:: Verifica se cloudflared existe na pasta
IF NOT EXIST "cloudflared.exe" (
    echo  [AVISO] cloudflared.exe nao encontrado nesta pasta.
    echo.
    echo  Baixe em:
    echo  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    echo.
    echo  Renomeie para cloudflared.exe e coloque nesta pasta.
    echo.
    pause
    exit /b 1
)

echo  Criando tunel para http://localhost:3001 ...
echo.
echo  IMPORTANTE: Copie a URL "trycloudflare.com" que aparecer
echo  e cole no portal (dwApi.ts ou variavel de ambiente).
echo.
cloudflared.exe tunnel --url http://localhost:3001

pause
