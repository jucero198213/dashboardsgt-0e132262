# Sistema de Chamados — Usuários + Admins

## Objetivo
Hoje a tela `/admin/chamados` é exclusiva para admins. Vamos transformar em um fluxo de duas pontas:
- **Usuário comum**: abre chamados, acompanha status, vê histórico próprio e troca mensagens (opcional).
- **Admin**: continua vendo todos os chamados, atribui responsável, muda status (aberto, em andamento, pendente, concluído, cancelado) e responde.

## Alterações no banco
1. Adicionar coluna `aberto_por uuid` em `tickets` (id do usuário que abriu). Backfill com `created_by`.
2. Adicionar status `pendente` à lista de status válidos (já é texto, basta atualizar app).
3. Atualizar **RLS de `tickets`**:
   - SELECT: admin vê tudo; usuário vê apenas onde `aberto_por = auth.uid()`.
   - INSERT: qualquer usuário autenticado pode inserir, desde que `aberto_por = auth.uid()` e `status = 'aberto'`.
   - UPDATE: apenas admin (usuário não edita após abrir; pode cancelar o próprio — opcional, ver pergunta).
   - DELETE: apenas admin.
4. Nova tabela opcional `ticket_messages` (id, ticket_id, autor_id, mensagem, created_at) para conversa entre usuário e admin. RLS: ambos os lados envolvidos no chamado podem ler/escrever.

## Alterações no frontend

### Nova rota de usuário: `/chamados`
- Acessível a qualquer usuário autenticado (sem `requiredPage`).
- Lista os chamados do usuário com badge de status e prioridade.
- Botão "Abrir novo chamado" → modal com título, descrição, prioridade.
- Clicar em um chamado abre painel/modal somente-leitura com status atual, responsável, observações do admin e (se habilitado) thread de mensagens.

### Item de menu
- Adicionar "Chamados" no menu/portal `/home` para todos os usuários.
- Admin continua com "Agenda de Chamados" no Painel Administrativo.

### Tela admin (`/admin/chamados`)
- Mostrar coluna "Aberto por" (nome/email) na lista e no modal.
- Adicionar status **Pendente** ao seletor.
- (Se mensagens habilitadas) painel de respostas no `TicketModal`.

### `ticketsApi.ts`
- Atualizar tipos: novo status `pendente`, novo campo `aberto_por`.
- Funções novas: `fetchMyTickets()`, `createUserTicket(payload)` que força `aberto_por = user.id` e `status = 'aberto'`.

## Perguntas em aberto
- Usuário pode **cancelar** o próprio chamado antes de ser tratado? (sugestão: sim)
- Quer **thread de mensagens** entre usuário e admin agora, ou só status + observações por enquanto?
- Notificação ao admin quando um chamado é aberto (toast no `/home`, badge no menu)?

Confirme essas três decisões e eu implemento.
