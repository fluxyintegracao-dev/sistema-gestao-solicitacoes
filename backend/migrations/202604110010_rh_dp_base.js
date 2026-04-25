const { quoteIdentifier, resolveTableName, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    const tabelaObras = await resolveTableName(sequelize, ['Obras', 'obras'], 'Obras');
    const tabelaObrasSql = quoteIdentifier(tabelaObras);

    if (!(await tableExists(sequelize, 'rh_empresas_grupo'))) {
      await sequelize.query(`
        CREATE TABLE rh_empresas_grupo (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(60) NULL,
          nome VARCHAR(160) NOT NULL,
          razao_social VARCHAR(200) NULL,
          cnpj VARCHAR(20) NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_empresas_grupo_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_empresas_grupo_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uk_rh_empresas_grupo_codigo (codigo),
          UNIQUE KEY uk_rh_empresas_grupo_cnpj (cnpj),
          KEY idx_rh_empresas_grupo_nome (nome),
          KEY idx_rh_empresas_grupo_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'rh_colaboradores'))) {
      await sequelize.query(`
        CREATE TABLE rh_colaboradores (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          empresa_grupo_id INT NOT NULL,
          obra_id INT NULL,
          setor_id INT NULL,
          nome VARCHAR(180) NOT NULL,
          cpf VARCHAR(14) NOT NULL,
          matricula VARCHAR(60) NULL,
          rg VARCHAR(30) NULL,
          telefone VARCHAR(30) NULL,
          email VARCHAR(160) NULL,
          cargo VARCHAR(120) NULL,
          tipo_vinculo VARCHAR(20) NOT NULL,
          data_inicio DATE NULL,
          data_admissao DATE NULL,
          data_nascimento DATE NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
          salario_base DECIMAL(14,2) NULL,
          valor_contratual DECIMAL(14,2) NULL,
          observacoes TEXT NULL,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_colaboradores_empresa FOREIGN KEY (empresa_grupo_id) REFERENCES rh_empresas_grupo(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_rh_colaboradores_obra FOREIGN KEY (obra_id) REFERENCES ${tabelaObrasSql}(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_colaboradores_setor FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_colaboradores_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_colaboradores_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uk_rh_colaboradores_cpf (cpf),
          UNIQUE KEY uk_rh_colaboradores_matricula (matricula),
          KEY idx_rh_colaboradores_empresa (empresa_grupo_id),
          KEY idx_rh_colaboradores_obra (obra_id),
          KEY idx_rh_colaboradores_setor (setor_id),
          KEY idx_rh_colaboradores_nome (nome),
          KEY idx_rh_colaboradores_tipo_vinculo (tipo_vinculo),
          KEY idx_rh_colaboradores_status (status)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'rh_colaborador_pagamentos'))) {
      await sequelize.query(`
        CREATE TABLE rh_colaborador_pagamentos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          colaborador_id INT NOT NULL,
          favorecido_nome VARCHAR(180) NULL,
          favorecido_documento VARCHAR(20) NULL,
          banco VARCHAR(80) NULL,
          agencia VARCHAR(30) NULL,
          conta VARCHAR(40) NULL,
          tipo_conta VARCHAR(30) NULL,
          chave_pix VARCHAR(120) NULL,
          observacoes TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_colaborador_pagamentos_colaborador FOREIGN KEY (colaborador_id) REFERENCES rh_colaboradores(id) ON DELETE CASCADE ON UPDATE CASCADE,
          UNIQUE KEY uk_rh_colaborador_pagamentos_colaborador (colaborador_id),
          KEY idx_rh_colaborador_pagamentos_documento (favorecido_documento)
        )
      `);
    }
  }
};
