module.exports = {
  async up({ sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS obra_custo_historico_importacoes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        arquivo_hash VARCHAR(64) NOT NULL,
        arquivo_nome VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADA',
        total_lidos INT NOT NULL DEFAULT 0,
        importados INT NOT NULL DEFAULT 0,
        duplicados INT NOT NULL DEFAULT 0,
        erros INT NOT NULL DEFAULT 0,
        valor_total DECIMAL(14,2) NOT NULL DEFAULT 0,
        criado_por INT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_obra_custo_hist_imp_hash (arquivo_hash),
        INDEX idx_obra_custo_hist_imp_criado_por (criado_por)
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS obra_custos_historicos (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        importacao_id INT NULL,
        obra_id INT NOT NULL,
        empresa_id INT NULL,
        parceiro_id INT NULL,
        categoria_financeira_id INT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'PAGAR',
        data_pagamento DATE NOT NULL,
        data_vencimento DATE NULL,
        parceiro_nome VARCHAR(255) NULL,
        parceiro_documento VARCHAR(32) NULL,
        titulo_parcela VARCHAR(120) NULL,
        documento VARCHAR(160) NULL,
        plano_financeiro VARCHAR(255) NULL,
        descricao VARCHAR(500) NULL,
        valor DECIMAL(14,2) NOT NULL,
        origem VARCHAR(40) NOT NULL DEFAULT 'HISTORICO_LEGADO',
        hash_linha VARCHAR(64) NOT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        criado_por INT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_obra_custos_historicos_hash (hash_linha),
        INDEX idx_obra_custos_historicos_obra_data (obra_id, data_pagamento),
        INDEX idx_obra_custos_historicos_empresa_data (empresa_id, data_pagamento),
        INDEX idx_obra_custos_historicos_tipo (tipo),
        INDEX idx_obra_custos_historicos_categoria (categoria_financeira_id),
        INDEX idx_obra_custos_historicos_parceiro (parceiro_id),
        INDEX idx_obra_custos_historicos_importacao (importacao_id),
        INDEX idx_obra_custos_historicos_ativo (ativo)
      )
    `);
  }
};
