-- Remove a constraint antiga (se existir)
ALTER TABLE page_permissions DROP CONSTRAINT IF EXISTS page_permissions_page_check;

-- Remove permissões antigas que não existem mais (valores de módulo)
DELETE FROM page_permissions WHERE page IN (
  'dashboard', 'indicadores', 'financeiro', 'gestao', 'operacao', 'compras', 'rh', 'suporte'
);

-- Cria nova constraint com todos os valores de tela individual
ALTER TABLE page_permissions ADD CONSTRAINT page_permissions_page_check CHECK (page IN (
  'fin-painel',
  'fin-pagar',
  'fin-receber',
  'fin-conciliacao',
  'fin-realizado',
  'fin-previsto',
  'fin-relatorios',
  'ext-fiscal',
  'fin-fornecedores',
  'fin-clientes',
  'fin-categorias',
  'fin-bancos',
  'ext-executivo',
  'ext-indicadores',
  'ext-faturamento',
  'ext-operacional',
  'ext-frota',
  'ext-fin-frota',
  'ext-manutencao',
  'ext-abastecimento',
  'ext-compras',
  'ext-rh',
  'ext-chamados',
  'portal-receitaflow',
  'portal-visual',
  'sofia-ai'
));