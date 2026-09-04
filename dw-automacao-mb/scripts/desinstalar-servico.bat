@echo off
REM  Remove o servico AutomacaoMB do Windows
REM  Executar como Administrador!

set SERVICE_NAME=AutomacaoMB

echo Parando servico %SERVICE_NAME%...
nssm stop %SERVICE_NAME%

echo Removendo servico %SERVICE_NAME%...
nssm remove %SERVICE_NAME% confirm

echo.
echo Servico removido com sucesso.
pause
