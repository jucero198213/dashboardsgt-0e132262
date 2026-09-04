# SGT Log — Workspace

## Workflow de desenvolvimento

### Issues e PRs (obrigatório)

- **Toda tarefa** (correção, melhoria ou nova função) deve ter uma **Issue** no GitHub antes de iniciar o trabalho.
- Labels padrão: `bug`, `melhoria`, `nova-função`.
- Cada Issue ganha uma **branch dedicada**:
  - `fix/<slug>` para bugs
  - `feat/<slug>` para novas funções
  - `improve/<slug>` para melhorias
- O trabalho é feito na branch e mergeado via **Pull Request**.
- O PR **deve mencionar a Issue** na descrição (ex: `Closes #12`).
- Após merge do PR, a branch é deletada.

### Deploy

- **Frontend + Edge Functions (Supabase):** deploy via **Lovable** (sync GitHub > Lovable redeploy). NUNCA usar Supabase CLI.
- **DW (dw-api-local, dw-automacao-mb):** `git pull` na máquina do servidor + reiniciar o bat/serviço.
- **Cloudflare Tunnel:** configurado via `cloudflared` no servidor.

## Estrutura do projeto

| Pasta | Descrição |
|-------|-----------|
| `dw-api-local/` | API local (Express + MSSQL) — roda no servidor DW |
| `dw-automacao-mb/` | Automação de baixa (IMAP watcher + bot PyAutoGUI) |
| `supabase/functions/` | Edge functions (Sofia AI assistant, etc.) |
| `src/` | Frontend React (ReceitaFlow / SGT Log) |

## Convenções

- Commits em português, formato: `tipo(escopo): descrição`
  - Tipos: `fix`, `feat`, `improve`, `refactor`, `docs`
- Logs do bot usam timezone `America/Sao_Paulo`
- Coordenadas do bot vêm de `coordenadas.json` (gerado por `calibrar_teclado.py`)
- Variáveis sensíveis ficam em `.env` (nunca commitados)
