# Instalação — Automação MB (Máquina DW Windows)

## 1. Pré-requisitos

### Python
- Baixar em python.org → marcar "Add to PATH"
- No CMD admin:
  ```
  pip install pyautogui pyperclip pillow
  ```

### Node.js (já instalado)
Na pasta do projeto:
```
npm install
npx playwright install chromium
```

---

## 2. Configurar o .env

Copiar `.env.example` → `.env` e preencher:

```
IMAP_USER=<gmail criado para a automação>
IMAP_PASS=<App Password de 16 dígitos>
RF_PASS=Dp102868*
RDP_WEB_PASS=carolinda
RDP_APP_PASS=123
WHATSAPP_NUMEROS=5519984270872,5519997662102
DOWNLOADS_DIR=C:\automacao-mb\downloads
NOME_PLANILHA_MB=Sheet1    ← confirmar após primeiro teste no ReceitaFlow
```

### Como gerar o App Password do Gmail
1. Acesse myaccount.google.com → Segurança
2. Ative a Verificação em 2 etapas (se ainda não tiver)
3. Vá em "Senhas de app" → criar para "Outro" → nome: "automacao-mb"
4. Cole o código de 16 dígitos no .env como IMAP_PASS

---

## 3. Calibrar coordenadas do Rodopar

Execute no CMD:
```
python scripts\rodopar_bot.py --calibrate
```

Passe o mouse sobre cada elemento do Rodopar e anote o (x, y).
Atualize as constantes no topo do arquivo `scripts/rodopar_bot.py`.

Elementos a calibrar:
- [ ] Campo Login (tela Visual Rodopar)
- [ ] Campo Senha (tela Visual Rodopar)
- [ ] Botão OK (tela Visual Rodopar)
- [ ] Botão Continuar (tela Selecione Filial)
- [ ] Menu "Fluxo de Caixa"
- [ ] Submenu "Movimentação"
- [ ] Item "Baixa por Aviso Bancário"
- [ ] Campo Conta Corrente (formulário AVI)
- [ ] Campo Data do Aviso
- [ ] Campo Data de Referência
- [ ] Campo Valor
- [ ] Aba "Itens do Aviso"
- [ ] Botão "Importar Itens"
- [ ] Botão "..."
- [ ] Pasta WebFile na janela de seleção
- [ ] Arquivo dentro do WebFile
- [ ] Campo "Nome da Planilha"
- [ ] Botão "Processar" (importação)
- [ ] Botão "Cancelar" (fecha o diálogo após processar — aguarda ~1 min antes de clicar)
- [ ] Botão "Fecha Aviso" (na tela principal, após fechar o diálogo)
- [ ] Área do canvas Citrix (para drag-and-drop)
- [ ] Ícone do arquivo no Explorer (para drag-and-drop)

---

## 4. Confirmar nome da aba da planilha MB

Antes de ativar a automação:
1. Fazer uma baixa MB manualmente no ReceitaFlow
2. Abrir o arquivo gerado no Excel
3. Ver o nome da aba (tab na parte inferior)
4. Atualizar NOME_PLANILHA_MB no .env

---

## 5. Testar manualmente

```
node index.js
```

Enviar um e-mail de teste para o Gmail configurado:
- Assunto: BAIXA MB
- Anexo: planilha do MB
- Corpo:
  ```
  DATA_RECEBIMENTO: 22/07/2026
  DATA_VENCIMENTO: 22/07/2026
  VALOR_BANCO: 1.000,00
  ```

---

## 6. Registrar como serviço Windows (NSSM)

No CMD admin:
```
nssm install automacao-mb "C:\Program Files\nodejs\node.exe" "C:\caminho\para\dw-automacao-mb\index.js"
nssm set automacao-mb AppDirectory "C:\caminho\para\dw-automacao-mb"
nssm set automacao-mb AppEnvironmentExtra .env
nssm start automacao-mb
```

Para parar/reiniciar:
```
nssm stop automacao-mb
nssm start automacao-mb
```

---

## 7. Confirmar endpoint WhatsApp

Verificar qual endpoint o servidor DW usa para enviar WhatsApp e ajustar em `modules/notifier.js` se necessário.
Atualmente configurado: `POST ${SOFIA_ENDPOINT}/api/whatsapp/enviar`
