-- Adicionar campo unidade_manual para permitir entrada manual de unidade
ALTER TABLE insumos ADD COLUMN unidade_manual VARCHAR(255) NULL AFTER unidade_id;
