-- Adiciona ext-pneus ao CHECK constraint de page_permissions
ALTER TABLE page_permissions DROP CONSTRAINT IF EXISTS page_permissions_page_check;

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
  'ext-pneus',
  'ext-compras',
  'ext-rh',
  'ext-chamados',
  'portal-receitaflow',
  'portal-visual',
  'sofia-ai'
));
