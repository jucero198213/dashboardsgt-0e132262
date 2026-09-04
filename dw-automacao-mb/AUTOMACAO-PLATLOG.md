# Automação de Baixa — Platlog

Documentação completa do processo automatizado de baixa de recebimento do cliente **Platlog** no sistema Rodopar.

---

## Visão Geral

A automação monitora a caixa de entrada do Gmail `sgtrecebimento@gmail.com` a cada **2 minutos**. Quando encontra um e-mail com assunto **"BAIXA PLATLOG"**, executa o fluxo completo de forma autônoma — da leitura do e-mail até a importação no Rodopar.

### Fluxo Resumido

```
E-mail "BAIXA PLATLOG"
    ↓
Leitura IMAP (Gmail)
    ↓
Parse do corpo (DATA_RECEBIMENTO, VALOR_BANCO, DESCONTO)
    ↓
Salva anexo (.xlsx) em disco
    ↓
Processador Platlog (regras de série/tipo + desconto)
    ↓
Conferência de valor (planilha vs banco)
    ↓
Gera planilha de baixa (aba DOCUMENTO)
    ↓
Rodopar Bot (PyAutoGUI via TSplus)
    ↓
Notificação por e-mail (sucesso/erro/divergência)
```

---

## Formato do E-mail

O e-mail que dispara a automação deve seguir este formato:

| Campo | Valor |
|---|---|
| **Para** | `sgtrecebimento@gmail.com` |
| **Assunto** | `BAIXA PLATLOG` |
| **Anexo** | Planilha `.xlsx` da Platlog |
| **Corpo** | Campos obrigatórios (ver abaixo) |

### Corpo do E-mail

```
DATA_RECEBIMENTO: 03/08/2026
VALOR_BANCO: 50.000,00
DESCONTO: 1.500,00
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `DATA_RECEBIMENTO` | Sim | Data do recebimento (DD/MM/AAAA). Usada como "Data do Aviso" no Rodopar. |
| `VALOR_BANCO` | Sim | Valor total informado pelo banco. Usado para conferência contra a planilha e preenchido no campo "Valor" do Rodopar. |
| `DESCONTO` | Sim | Valor de desconto a ser aplicado nos documentos. Se não houver desconto, informar `0`. |

> Os campos podem usar `_` ou espaço como separador (ex: `DATA_RECEBIMENTO` ou `DATA RECEBIMENTO`).

---

## Processamento da Planilha

O processador Platlog (`modules/platlog-processor.js`) é uma porta fiel do processador do ReceitaFlow (`src/lib/processors/platlog.ts`).

### Leitura

1. Abre o arquivo `.xlsx` anexado ao e-mail
2. Procura uma aba com nome **"SGT"** (case-insensitive). Se não existir, usa a primeira aba
3. Localiza a linha de cabeçalho buscando as colunas:
   - **Documento:** `N.Fiscal` ou `Número`
   - **Valor:** `Vl.Total` ou `Valor do pagamento`

### Regras de Série e Tipo

A série e o tipo do documento são determinados pelo **prefixo do número do documento**:

| Prefixo do Documento | Série | Tipo Documento |
|---|---|---|
| Começa com `9` ou `1` | `4` | `CTRC` |
| Começa com `2` ou `3` | `NFD` | `NF` |
| Outros prefixos | *(ignorado)* | — |

### Aplicação de Desconto

Se o campo `DESCONTO` do e-mail for maior que zero:

1. Ordena os documentos do **maior valor para o menor**
2. Aplica o desconto no documento de maior valor primeiro
3. Se o desconto exceder o valor do documento, o saldo restante é aplicado no próximo
4. Documentos com valor final zero são **removidos** da planilha de saída

### Conferência de Valor

Após processar (e aplicar descontos), o valor total da planilha é comparado com o `VALOR_BANCO`:

- Se a diferença for **≥ R$ 0,01** → **DIVERGÊNCIA** → automação para, e-mail de alerta é enviado
- Se **nenhum documento válido** for encontrado → **DIVERGÊNCIA**
- Se os valores batem → gera a planilha de baixa e segue para o Rodopar

---

## Planilha de Saída

A planilha gerada para importação no Rodopar tem a seguinte estrutura:

| Coluna | Descrição |
|---|---|
| `FILIAL` | Sempre `1` |
| `SERIE` | `4` ou `NFD` (conforme regra do prefixo) |
| `Nº DOCUMENTO` | Número do documento extraído da planilha |
| `TIPO DOCUMENTO` | `CTRC` ou `NF` (conforme regra do prefixo) |
| `VALOR PAGO` | Valor final (após desconto, se houver) |

- **Nome da aba:** `DOCUMENTO`
- **Arquivo salvo em:** `downloads/platlog_baixa_{timestamp}.xlsx`

---

## Campos Preenchidos no Rodopar

O bot PyAutoGUI preenche o formulário de Aviso Bancário no Rodopar com os seguintes valores:

| Campo no Rodopar | Valor |
|---|---|
| Conta Corrente | `79235-7` |
| N° do Aviso | *(automático — gerado pelo Rodopar)* |
| Filial | `1` |
| Data do Aviso | Valor do campo `DATA_RECEBIMENTO` do e-mail |
| Tipo de Doc. Bancário | `AVI` |
| Histórico Bancário | `1` |
| Valor | Valor do campo `VALOR_BANCO` do e-mail |
| Complemento | `Baixa Platlog` |

Após preencher a aba 1, o bot:
1. Navega para a aba **Itens do Aviso**
2. Abre o diálogo de importação (`Alt+I`)
3. Seleciona o arquivo via **WebFile** (upload feito pelo TSplus)
4. Informa o nome da planilha: `DOCUMENTO`
5. Processa a importação (~2 min)
6. Verifica o campo **Situação** (detecta "Inconsistente" por imagem)
7. Clica em **Fecha Aviso**
8. Faz **Logoff** (limpa o WebFile para a próxima baixa)

---

## Notificações

A automação envia notificações por **e-mail** (e futuramente WhatsApp via Sofia) nos seguintes cenários:

### Sucesso ✅
```
Assunto: ✅ Baixa PLATLOG concluída — R$ 50.000,00 (03/08/2026)
```
Enviado quando todo o fluxo é concluído sem erros.

### Divergência ⚠️
```
Assunto: ⚠️ Baixa PLATLOG — Divergência (fazer manual)
```
Enviado quando o valor da planilha não bate com o valor do banco. A baixa **NÃO** é feita no Rodopar.

### Erro ❌
```
Assunto: ❌ Baixa PLATLOG — Erro na etapa: [etapa]
```
Enviado quando ocorre um erro técnico (IMAP, processamento, bot). Inclui detalhes do erro.

### E-mail Inválido 📧
```
Assunto: 📧 Baixa PLATLOG — E-mail inválido
```
Enviado quando o e-mail está incompleto (faltando campos ou sem anexo).

### Troca de Senha 🔐
```
Assunto: 🔐 Baixa PLATLOG — Troca de senha obrigatória
```
Enviado quando o Rodopar exige troca de senha. A baixa precisa ser feita manualmente.

### Inconsistência ⚠️
```
Assunto: ⚠️ Baixa PLATLOG — Situação Inconsistente no Rodopar
```
Enviado quando a importação resulta em "Inconsistente" no campo Situação do Rodopar.

**Destinatários:** configurados na variável `EMAIL_NOTIF` do `.env` (adm, contasareceber, giuliana@sgtlog.com.br).

---

## Diferenças entre MB e Platlog

| Aspecto | Martin Brower (MB) | Platlog |
|---|---|---|
| Assunto do e-mail | `BAIXA MB` | `BAIXA PLATLOG` |
| Campos do corpo | DATA_RECEBIMENTO, DATA_VENCIMENTO, VALOR_BANCO | DATA_RECEBIMENTO, VALOR_BANCO, DESCONTO |
| Filtro por data de vencimento | Sim (filtra linhas pela data) | Não (processa todas as linhas) |
| Desconto | Não | Sim (aplicado no maior valor primeiro) |
| Colunas da planilha de entrada | Data Vcto., Data Pagamento, Nº Fatura, Valor Bruto | N.Fiscal/Número, Vl.Total/Valor do pagamento |
| Regra de série | `36` → serie 36, `1` → serie 1 | `9`/`1` → serie 4, `2`/`3` → serie NFD |
| Regra de tipo | Sempre `CTRC` | `CTRC` ou `NF` |
| Complemento no Rodopar | `Baixa MB` | `Baixa Platlog` |
| Conta corrente | `79235-7` | `79235-7` |

---

## Arquitetura (Arquivos)

```
dw-automacao-mb/
├── index.js                      # Orquestrador multi-cliente
├── clients.js                    # Configuração de cada cliente
├── modules/
│   ├── imap-watcher.js           # Busca e-mails por assunto (IMAP)
│   ├── email-parser.js           # Parse do corpo (campos dinâmicos por cliente)
│   ├── platlog-processor.js      # Processador Platlog (regras + desconto)
│   ├── receitaflow.js            # Processador MB
│   ├── notifier.js               # Notificações (e-mail + WhatsApp)
│   └── logger.js                 # Logger com timestamp
├── scripts/
│   └── rodopar_bot.py            # Bot PyAutoGUI (Rodopar via TSplus)
├── downloads/                    # Planilhas de entrada e saída
├── logs/                         # Logs do serviço
└── INICIAR-AUTOMACAO.bat         # Inicia a automação (Startup do Windows)
```

---

## Monitoramento

Os logs da Platlog podem ser acompanhados em tempo real no **painel de controle**:

- **URL:** `dw.dwsgtlog.com/painel`
- **Tab:** `Platlog` (filtra automaticamente os logs com `[PLATLOG]`)

Todas as linhas de log da Platlog são prefixadas com `[PLATLOG]` para facilitar a filtragem.

---

## Configuração (clients.js)

```javascript
platlog: {
  nome: 'Platlog',
  sigla: 'PLATLOG',
  assuntoEmail: 'BAIXA PLATLOG',
  processador: 'platlog',
  complemento: 'Baixa Platlog',
  nomePlanilha: 'DOCUMENTO',
  rodopar: {
    conta: '79235-7',
    filial: '1',
    tipoDoc: 'AVI',
    histBancario: '1',
  },
}
```

---

## Adicionando um Novo Cliente

Para adicionar um terceiro cliente à automação:

1. **Criar o processador** em `modules/` (portar a lógica do ReceitaFlow)
2. **Adicionar a config** em `clients.js` (assunto, processador, campos Rodopar)
3. **Adicionar os campos do e-mail** em `email-parser.js` → `CAMPOS_EXTRAS`
4. **Importar o processador** em `index.js` e adicionar no `processarPlanilha()`
5. **Atualizar o painel** em `painel.html` (ativar a tab "Cliente 3")
6. **Commit, push, git pull na máquina DW e reiniciar o bat**
