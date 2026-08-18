-- Desvincula chamados das categorias antigas
UPDATE tickets SET categoria_id = NULL WHERE categoria_id IS NOT NULL;

-- Remove todas as categorias existentes
DELETE FROM ticket_categorias;

-- Insere as novas categorias
INSERT INTO ticket_categorias (nome, cor, ativo) VALUES
  ('Cadastros',                  '#3b82f6', true),
  ('Lançamentos',                '#8b5cf6', true),
  ('Erros de sistema',           '#ef4444', true),
  ('Acessos / Senha',            '#f59e0b', true),
  ('CIOT / Documentação Fiscal', '#10b981', true),
  ('Email',                      '#06b6d4', true),
  ('Operacional',                '#f97316', true),
  ('Equipamento',                '#6366f1', true),
  ('Impressão',                  '#ec4899', true),
  ('Relatório',                  '#14b8a6', true),
  ('Internet',                   '#0ea5e9', true),
  ('Outros',                     '#94a3b8', true);