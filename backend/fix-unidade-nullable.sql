-- Torna unidade_id nullable na tabela solicitacao_compra_itens
ALTER TABLE solicitacao_compra_itens MODIFY COLUMN unidade_id INT NULL;

-- Adiciona coluna unidade_sigla_manual se não existir
ALTER TABLE solicitacao_compra_itens ADD COLUMN IF NOT EXISTS unidade_sigla_manual VARCHAR(50) NULL;
