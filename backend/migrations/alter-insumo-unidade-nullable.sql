-- Tornar unidade_id opcional em insumos

-- Alterar a coluna para permitir NULL
ALTER TABLE insumos MODIFY COLUMN unidade_id INT NULL;
