@echo off
:: ─────────────────────────────────────────────────────────────
::  INICIAR-STATUS.bat — abre a tela de status (status.html) em
::  modo kiosk (tela cheia) no Microsoft Edge.
::  Coloque este .bat na MESMA pasta do status.html.
::  Para fechar a tela: Alt + F4.
:: ─────────────────────────────────────────────────────────────
start "" msedge --kiosk "file:///%~dp0status.html" --edge-kiosk-type=fullscreen --no-first-run --disable-session-crashed-bubble --disable-infobars --overscroll-history-navigation=0
