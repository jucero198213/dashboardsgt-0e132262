# Padronização global: sidebar do /financeiro em todas as telas internas

## Objetivo
Aplicar exatamente a mesma sidebar da tela `/financeiro` em todas as telas internas (exceto `/home` e `/login`), mantendo um padrão visual único, e remover o `UserMenu` (avatar) e o `HomeButton` do canto superior direito de todas elas. Logout, troca de tema e acesso administrativo passam a viver dentro da própria sidebar.

## Arquitetura proposta

### 1. Novo componente `src/components/shared/AppShell.tsx`
Layout-wrapper único que substitui o boilerplate repetido em cada página:

- Container externo `min-h-[100dvh]` + `BackgroundEffects`
- `<section>` arredondada (mesmo estilo do Finance)
- Header desktop e header mobile (logo SGT + título da workspace + badge "Tempo Real")
- Slot opcional para filtros customizados (`headerSlot`)
- Sidebar idêntica à do Finance (colapsável, modo pílula com hover-expand, ámbar nos ativos)
- `<main>` com o `children` da página
- Sem `UserMenu` e sem `HomeButton` no header

Props: `title`, `headerSlot?`, `children`.

### 2. Novo componente `src/components/shared/AppSidebar.tsx`
Extraído do bloco `<aside>` do `Finance.tsx`:

- Lista `NAV` movida para `src/components/shared/appNav.ts` (única fonte de verdade)
- Detecção de "ativo" via `useLocation().pathname` (compara com `externalTo`)
- Na rota `/financeiro`, mantém comportamento interno (sub-screens via prop `activeInternal` + `onSelectInternal`)
- Itens extras no rodapé da sidebar: **Tema** (sun/moon), **Área Administrativa** (só admin), **Sair** — substituem o UserMenu
- Estado `collapsed` persistido em `localStorage` (`sgt-sidebar-collapsed`) para manter preferência entre telas

### 3. Refator do `Finance.tsx`
- Remove duplicação: passa a usar `<AppShell>` + `<AppSidebar activeInternal={active} onSelectInternal={setActive} />`
- Mantém os filtros (data/empresa/filial/update) via `headerSlot`
- Comportamento 100% preservado

### 4. Aplicação nas demais páginas
Rotas afetadas (todas dentro de `<ProtectedRoute>`):

```text
/dashboard            → Index.tsx
/indicadores          → Indicadores.tsx
/indicadores/:id      → IndicadorDetalhe.tsx
/contas-a-receber     → ContasAReceber.tsx
/contas-a-pagar       → ContasAPagar.tsx
/financiamento-frota  → FinanciamentoFrota.tsx
/faturamento          → Faturamento.tsx
/frota                → Frota.tsx
/manutencao           → Manutencao.tsx
/compras              → Compras.tsx
/abastecimento        → Abastecimento.tsx
/rh                   → Rh.tsx
/operacional          → Operacional.tsx
/executivo            → Executivo.tsx
/financeiro           → Finance.tsx (já tratado acima)
/chamados             → Chamados.tsx
/admin                → admin/PainelAdministrativo.tsx
/em-desenvolvimento/* → EmDesenvolvimento.tsx
```

Em cada uma:
- Remover `<HomeButton>` e `<UserMenu>` dos headers existentes
- Trocar o wrapper externo (div + BackgroundEffects + section…) por `<AppShell title="…" headerSlot={…}>`
- Manter o conteúdo interno (KPIs, tabelas, gráficos, filtros) intacto — só muda a casca

> Não toco em `/home` nem `/login` (você pediu para excluir).

## O que NÃO muda
- Lógica de dados, contextos, filtros, gráficos, permissões
- Tema claro/escuro, cores semânticas, tokens
- Comportamento mobile (MobileNav segue existindo para navegação rápida em telas pequenas)

## Detalhes técnicos
- Active state da sidebar: `pathname.startsWith(item.externalTo)` para suportar rotas dinâmicas (`/indicadores/:id`)
- Para evitar regressões visuais, manterei os mesmos tokens CSS (`--sgt-bg-section`, `--sgt-border-subtle`, etc.)
- O botão de logout dentro da sidebar usa `signOut()` do `AuthContext`; tema usa `toggleTheme()` do `ThemeContext`; link admin condicionado a `isAdmin`
- Toggle collapsed continua disponível no header desktop (botão `PanelLeftClose/Open`)

## Riscos / pontos de atenção
1. Cada página tem header com filtros bem diferentes → o `headerSlot` cobre isso, mas vou validar página por página
2. `Index.tsx` (dashboard) e `Indicadores.tsx` têm presentation mode / hotkey → preservar
3. Telas com upload Excel (ContasAPagar/Receber) têm fluxos próprios → só altero o chrome externo
4. Build pode acusar imports não usados (`HomeButton`, `UserMenu`) — removo junto

## Entrega
Após sua aprovação executo em lote:
1. Criar `appNav.ts`, `AppSidebar.tsx`, `AppShell.tsx`
2. Refatorar `Finance.tsx`
3. Aplicar `AppShell` em todas as páginas listadas em paralelo
4. Validar build
