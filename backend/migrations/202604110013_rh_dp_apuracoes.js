const { quoteIdentifier, resolveTableName, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    const tabelaObras = await resolveTableName(sequelize, ['Obras', 'obras'], 'Obras');
    const tabelaObrasSql = quoteIdentifier(tabelaObras);

    if (!(await tableExists(sequelize, 'rh_apuracoes'))) {
      await sequelize.query(`
        CREATE TABLE rh_apuracoes (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          competencia VARCHAR(7) NOT NULL,
          empresa_grupo_id INT NOT NULL,
          obra_id INT NULL,
          tipo_vinculo VARCHAR(20) NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'RASCUNHO',
          dias_base INT NOT NULL DEFAULT 30,
          total_colaboradores INT NOT NULL DEFAULT 0,
          total_bruto DECIMAL(14,2) NOT NULL DEFAULT 0,
          total_descontos DECIMAL(14,2) NOT NULL DEFAULT 0,
          total_liquido DECIMAL(14,2) NOT NULL DEFAULT 0,
          observacoes TEXT NULL,
          resumo_json JSON NULL,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_apuracoes_empresa FOREIGN KEY (empresa_grupo_id) REFERENCES rh_empresas_grupo(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_rh_apuracoes_obra FOREIGN KEY (obra_id) REFERENCES ${tabelaObrasSql}(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_apuracoes_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_apuracoes_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_rh_apuracoes_competencia (competencia),
          KEY idx_rh_apuracoes_empresa (empresa_grupo_id),
          KEY idx_rh_apuracoes_status (status),
          KEY idx_rh_apuracoes_obra (obra_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'rh_apuracao_eventos'))) {
      await sequelize.query(`
        CREATE TABLE rh_apuracao_eventos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          apuracao_id INT NOT NULL,
          colaborador_id INT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
          regra_aplicada VARCHAR(60) NULL,
          valor_base_calculo DECIMAL(14,2) NOT NULL DEFAULT 0,
          dias_trabalhados DECIMAL(10,2) NOT NULL DEFAULT 0,
          faltas DECIMAL(10,2) NOT NULL DEFAULT 0,
          horas_extras DECIMAL(10,2) NOT NULL DEFAULT 0,
          valor_bruto DECIMAL(14,2) NOT NULL DEFAULT 0,
          valor_descontos DECIMAL(14,2) NOT NULL DEFAULT 0,
          ajuste_credito_manual DECIMAL(14,2) NOT NULL DEFAULT 0,
          ajuste_debito_manual DECIMAL(14,2) NOT NULL DEFAULT 0,
          valor_liquido DECIMAL(14,2) NOT NULL DEFAULT 0,
          observacoes TEXT NULL,
          detalhes_json JSON NULL,
          ajustado_por INT NULL,
          ajustado_em DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_apuracao_eventos_apuracao FOREIGN KEY (apuracao_id) REFERENCES rh_apuracoes(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_rh_apuracao_eventos_colaborador FOREIGN KEY (colaborador_id) REFERENCES rh_colaboradores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_rh_apuracao_eventos_ajustado_por FOREIGN KEY (ajustado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uq_rh_apuracao_eventos_apuracao_colaborador (apuracao_id, colaborador_id),
          KEY idx_rh_apuracao_eventos_status (status),
          KEY idx_rh_apuracao_eventos_colaborador (colaborador_id)
        )
      `);
    }
  }
};
