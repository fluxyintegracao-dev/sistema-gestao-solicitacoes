const { columnExists, tableExists } = require('./schemaUtils');

async function runLegacySchemaBootstrap(db) {
  try {
    await db.sequelize.query(
      "UPDATE setores SET codigo = CONCAT('SETOR_', LPAD(id, 3, '0')) WHERE codigo IS NULL OR codigo = ''"
    );
  } catch (error) {
    // ignora se a tabela ainda nao existe
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE historicos MODIFY usuario_responsavel_id INT NULL"
    );
  } catch (error) {
    // ignora se a tabela ainda nao existe
  }

  try {
    await db.sequelize.query(
      "UPDATE anexos SET tipo = UPPER(tipo) WHERE tipo IS NOT NULL"
    );
    await db.sequelize.query(
      "UPDATE anexos SET tipo = 'ANEXO' WHERE tipo IS NULL OR UPPER(tipo) NOT IN ('ANEXO','SOLICITACAO','CONTRATO','COMPROVANTE')"
    );
  } catch (error) {
    // ignora se a tabela ainda nao existe
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE solicitacao_visibilidade_usuario DROP FOREIGN KEY solicitacao_visibilidade_usuario_ibfk_3"
    );
  } catch (error) {
    // ignora se a constraint nao existe
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE solicitacao_visibilidade_usuario DROP FOREIGN KEY solicitacao_visibilidade_usuario_ibfk_2"
    );
  } catch (error) {
    // ignora se a constraint nao existe
  }

  try {
    await db.sequelize.query(
      "CREATE TABLE IF NOT EXISTS configuracoes_sistema (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, chave VARCHAR(255) NOT NULL, valor TEXT NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL)"
    );
  } catch (error) {
    // ignora se nao conseguir criar
  }

  try {
    const [rows] = await db.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipos_sub_contrato' AND COLUMN_NAME = 'tipo_macro_id' AND REFERENCED_TABLE_NAME = 'tipos_macro_contrato' LIMIT 1"
    );
    if (rows.length > 0) {
      await db.sequelize.query(
        `ALTER TABLE tipos_sub_contrato DROP FOREIGN KEY ${rows[0].CONSTRAINT_NAME}`
      );
    }
  } catch (error) {
    // ignora se a constraint nao existe
  }

  try {
    const [rows] = await db.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipos_sub_contrato' AND COLUMN_NAME = 'tipo_macro_id' AND REFERENCED_TABLE_NAME = 'tipo_solicitacao' LIMIT 1"
    );
    if (rows.length === 0) {
      await db.sequelize.query(
        "ALTER TABLE tipos_sub_contrato ADD CONSTRAINT tipos_sub_contrato_ibfk_1 FOREIGN KEY (tipo_macro_id) REFERENCES tipo_solicitacao(id) ON DELETE CASCADE ON UPDATE CASCADE"
      );
    }
  } catch (error) {
    // ignora se a constraint ja existe
  }

  try {
    const [rows] = await db.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitacoes' AND COLUMN_NAME = 'tipo_macro_id' AND REFERENCED_TABLE_NAME = 'tipos_macro_contrato'"
    );
    for (const row of rows) {
      await db.sequelize.query(
        `ALTER TABLE solicitacoes DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`
      );
    }
  } catch (error) {
    // ignora se a constraint nao existe
  }

  try {
    const [rows] = await db.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitacoes' AND COLUMN_NAME = 'tipo_macro_id' AND REFERENCED_TABLE_NAME = 'tipo_solicitacao' LIMIT 1"
    );
    if (rows.length === 0) {
      await db.sequelize.query(
        "ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_ibfk_tipo_macro FOREIGN KEY (tipo_macro_id) REFERENCES tipo_solicitacao(id) ON DELETE SET NULL ON UPDATE CASCADE"
      );
    }
  } catch (error) {
    // ignora se a constraint ja existe
  }

  try {
    const [rows] = await db.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contratos' AND COLUMN_NAME = 'tipo_macro_id' AND REFERENCED_TABLE_NAME = 'tipos_macro_contrato' LIMIT 1"
    );
    if (rows.length > 0) {
      await db.sequelize.query(
        `ALTER TABLE contratos DROP FOREIGN KEY ${rows[0].CONSTRAINT_NAME}`
      );
    }
  } catch (error) {
    // ignora se a constraint nao existe
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE contratos MODIFY tipo_macro_id INT NULL"
    );
  } catch (error) {
    // ignora se a coluna ja eh NULL
  }

  try {
    const [rows] = await db.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contratos' AND COLUMN_NAME = 'tipo_macro_id' AND REFERENCED_TABLE_NAME = 'tipo_solicitacao' LIMIT 1"
    );
    if (rows.length === 0) {
      await db.sequelize.query(
        "ALTER TABLE contratos ADD CONSTRAINT contratos_ibfk_tipo_macro FOREIGN KEY (tipo_macro_id) REFERENCES tipo_solicitacao(id) ON DELETE CASCADE ON UPDATE CASCADE"
      );
    }
  } catch (error) {
    // ignora se a constraint ja existe
  }

  try {
    const [rows] = await db.sequelize.query(
      "SHOW COLUMNS FROM contratos LIKE 'fornecedor'"
    );
    if (rows.length > 0) {
      await db.sequelize.query(
        "ALTER TABLE contratos CHANGE fornecedor ref_contrato VARCHAR(255) NULL"
      );
    }
  } catch (error) {
    // ignora se a coluna ja foi renomeada
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE solicitacoes ADD COLUMN data_inicio_medicao DATE NULL"
    );
  } catch (error) {
    // ignora se a coluna ja existe
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE solicitacoes ADD COLUMN data_fim_medicao DATE NULL"
    );
  } catch (error) {
    // ignora se a coluna ja existe
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE contratos ADD COLUMN itens_apropriacao TEXT NULL"
    );
  } catch (error) {
    // ignora se a coluna ja existe
  }

  try {
    const hasColumn = await columnExists(db.sequelize, 'users', 'pode_criar_solicitacao_compra');
    if (!hasColumn) {
      await db.sequelize.query(
        "ALTER TABLE users ADD COLUMN pode_criar_solicitacao_compra BOOLEAN NOT NULL DEFAULT 0"
      );
    }

    await db.sequelize.query(
      "UPDATE users SET pode_criar_solicitacao_compra = 1 WHERE perfil IN ('SUPERADMIN', 'ADMIN')"
    );
  } catch (error) {
    // ignora se nao conseguir aplicar agora
  }

  try {
    const hasUnidades = await tableExists(db.sequelize, 'unidades');
    if (hasUnidades) {
      const [rows] = await db.sequelize.query('SELECT COUNT(*) AS total FROM unidades');
      if (Number(rows?.[0]?.total || 0) === 0) {
        await db.sequelize.query(
          `INSERT INTO unidades (nome, sigla) VALUES
            ('Metro', 'm'),
            ('Metro Quadrado', 'm2'),
            ('Metro Cubico', 'm3'),
            ('Quilograma', 'kg'),
            ('Tonelada', 't'),
            ('Litro', 'L'),
            ('Unidade', 'un'),
            ('Caixa', 'cx'),
            ('Pacote', 'pct'),
            ('Saco', 'sc')`
        );
      }
    }
  } catch (error) {
    // ignora se nao conseguir popular
  }

  try {
    const hasCategorias = await tableExists(db.sequelize, 'categorias');
    if (hasCategorias) {
      const [rows] = await db.sequelize.query('SELECT COUNT(*) AS total FROM categorias');
      if (Number(rows?.[0]?.total || 0) === 0) {
        await db.sequelize.query(
          `INSERT INTO categorias (nome) VALUES
            ('Material de Construcao'),
            ('Ferramentas'),
            ('Equipamentos'),
            ('Eletrica'),
            ('Hidraulica'),
            ('Acabamento'),
            ('Outros')`
        );
      }
    }
  } catch (error) {
    // ignora se nao conseguir popular
  }
}

function refreshLegacyModelAttributes(db) {
  if (db.User?.rawAttributes?.email) {
    db.User.rawAttributes.email.unique = false;
    db.User.refreshAttributes();
  }
  if (db.Cargo?.rawAttributes?.codigo) {
    db.Cargo.rawAttributes.codigo.unique = false;
    db.Cargo.refreshAttributes();
  }
  if (db.Setor?.rawAttributes?.codigo) {
    db.Setor.rawAttributes.codigo.unique = false;
    db.Setor.refreshAttributes();
  }
  if (db.Obra?.rawAttributes?.codigo) {
    db.Obra.rawAttributes.codigo.unique = false;
    db.Obra.refreshAttributes();
  }
  if (db.Contrato?.rawAttributes?.codigo) {
    db.Contrato.rawAttributes.codigo.unique = false;
    db.Contrato.refreshAttributes();
  }
  if (db.TipoMacroContrato?.rawAttributes?.nome) {
    db.TipoMacroContrato.rawAttributes.nome.unique = false;
    db.TipoMacroContrato.refreshAttributes();
  }
  if (db.SetorPermissao?.rawAttributes?.setor) {
    db.SetorPermissao.rawAttributes.setor.unique = false;
    db.SetorPermissao.refreshAttributes();
  }
}

module.exports = {
  refreshLegacyModelAttributes,
  runLegacySchemaBootstrap
};
