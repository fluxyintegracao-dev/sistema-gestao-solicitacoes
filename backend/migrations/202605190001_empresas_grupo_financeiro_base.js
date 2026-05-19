const { columnExists, foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function replaceEmpresaGrupoForeignKey({
  queryInterface,
  sequelize,
  tableName,
  oldConstraintName,
  newConstraintName,
  columnName,
  onDelete = 'RESTRICT'
}) {
  if (!(await tableExists(sequelize, tableName)) || !(await columnExists(sequelize, tableName, columnName))) {
    return;
  }

  if (oldConstraintName && await foreignKeyExists(sequelize, tableName, oldConstraintName)) {
    await queryInterface.removeConstraint(tableName, oldConstraintName);
  }

  if (!(await foreignKeyExists(sequelize, tableName, newConstraintName))) {
    await queryInterface.addConstraint(tableName, {
      fields: [columnName],
      type: 'foreign key',
      name: newConstraintName,
      references: {
        table: 'empresas_grupo',
        field: 'id'
      },
      onDelete,
      onUpdate: 'CASCADE'
    });
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    if (!(await tableExists(sequelize, 'empresas_grupo'))) {
      await queryInterface.createTable('empresas_grupo', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: Sequelize.STRING(60), allowNull: true },
        nome: { type: Sequelize.STRING(160), allowNull: false },
        razao_social: { type: Sequelize.STRING(200), allowNull: true },
        cnpj: { type: Sequelize.STRING(20), allowNull: true },
        ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        criado_por: { type: Sequelize.INTEGER, allowNull: true },
        atualizado_por: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
    }

    if (!(await indexExists(sequelize, 'empresas_grupo', 'uk_empresas_grupo_codigo'))) {
      await queryInterface.addIndex('empresas_grupo', ['codigo'], {
        name: 'uk_empresas_grupo_codigo',
        unique: true
      });
    }

    if (!(await indexExists(sequelize, 'empresas_grupo', 'uk_empresas_grupo_cnpj'))) {
      await queryInterface.addIndex('empresas_grupo', ['cnpj'], {
        name: 'uk_empresas_grupo_cnpj',
        unique: true
      });
    }

    if (!(await indexExists(sequelize, 'empresas_grupo', 'idx_empresas_grupo_ativo'))) {
      await queryInterface.addIndex('empresas_grupo', ['ativo'], {
        name: 'idx_empresas_grupo_ativo'
      });
    }

    if (await tableExists(sequelize, 'rh_empresas_grupo')) {
      await sequelize.query(`
        INSERT INTO empresas_grupo
          (id, codigo, nome, razao_social, cnpj, ativo, criado_por, atualizado_por, createdAt, updatedAt)
        SELECT
          rh.id, rh.codigo, rh.nome, rh.razao_social, rh.cnpj, rh.ativo, rh.criado_por, rh.atualizado_por, rh.createdAt, rh.updatedAt
        FROM rh_empresas_grupo rh
        LEFT JOIN empresas_grupo eg ON eg.id = rh.id
        WHERE eg.id IS NULL
      `);
    }

    await replaceEmpresaGrupoForeignKey({
      queryInterface,
      sequelize,
      tableName: 'rh_colaboradores',
      oldConstraintName: 'fk_rh_colaboradores_empresa',
      newConstraintName: 'fk_rh_colaboradores_empresa_grupo',
      columnName: 'empresa_grupo_id'
    });

    await replaceEmpresaGrupoForeignKey({
      queryInterface,
      sequelize,
      tableName: 'rh_importacoes',
      oldConstraintName: 'fk_rh_importacoes_empresa',
      newConstraintName: 'fk_rh_importacoes_empresa_grupo',
      columnName: 'empresa_grupo_id'
    });

    await replaceEmpresaGrupoForeignKey({
      queryInterface,
      sequelize,
      tableName: 'rh_apuracoes',
      oldConstraintName: 'fk_rh_apuracoes_empresa',
      newConstraintName: 'fk_rh_apuracoes_empresa_grupo',
      columnName: 'empresa_grupo_id'
    });

    await replaceEmpresaGrupoForeignKey({
      queryInterface,
      sequelize,
      tableName: 'payment_accounts',
      oldConstraintName: 'fk_payment_accounts_empresa',
      newConstraintName: 'fk_payment_accounts_empresa_grupo',
      columnName: 'empresa_id',
      onDelete: 'SET NULL'
    });

    await replaceEmpresaGrupoForeignKey({
      queryInterface,
      sequelize,
      tableName: 'payment_batches',
      oldConstraintName: 'fk_payment_batches_empresa',
      newConstraintName: 'fk_payment_batches_empresa_grupo',
      columnName: 'empresa_id',
      onDelete: 'SET NULL'
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contas_bancarias', 'empresa_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'contas_bancarias', 'tipo_operacional', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'BANCARIA'
    });
    await addColumnIfMissing(queryInterface, sequelize, 'contas_bancarias', 'exige_abertura_fechamento', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, sequelize, 'contas_bancarias', 'saldo_inicial', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    });

    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'empresa_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'movimentos_financeiros', 'empresa_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'conciliacoes_bancarias', 'empresa_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'conciliacao_bancaria_importacoes', 'empresa_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await sequelize.query(`
      UPDATE contas_bancarias
      SET tipo_operacional = 'BANCARIA'
      WHERE tipo_operacional IS NULL OR tipo_operacional = ''
    `);

    await sequelize.query(`
      UPDATE movimentos_financeiros mf
      JOIN contas_bancarias cb ON cb.id = mf.conta_bancaria_id
      SET mf.empresa_id = cb.empresa_id
      WHERE mf.empresa_id IS NULL AND cb.empresa_id IS NOT NULL
    `).catch(() => {});

    await sequelize.query(`
      UPDATE conciliacoes_bancarias cbanc
      JOIN contas_bancarias cb ON cb.id = cbanc.conta_bancaria_id
      SET cbanc.empresa_id = cb.empresa_id
      WHERE cbanc.empresa_id IS NULL AND cb.empresa_id IS NOT NULL
    `).catch(() => {});
  },

  async down({ queryInterface, sequelize }) {
    const constraints = [
      ['payment_batches', 'fk_payment_batches_empresa_grupo'],
      ['payment_accounts', 'fk_payment_accounts_empresa_grupo'],
      ['rh_apuracoes', 'fk_rh_apuracoes_empresa_grupo'],
      ['rh_importacoes', 'fk_rh_importacoes_empresa_grupo'],
      ['rh_colaboradores', 'fk_rh_colaboradores_empresa_grupo']
    ];

    for (const [tableName, constraintName] of constraints) {
      if (await tableExists(sequelize, tableName) && await foreignKeyExists(sequelize, tableName, constraintName)) {
        await queryInterface.removeConstraint(tableName, constraintName);
      }
    }

    const columns = [
      ['conciliacao_bancaria_importacoes', 'empresa_id'],
      ['conciliacoes_bancarias', 'empresa_id'],
      ['movimentos_financeiros', 'empresa_id'],
      ['titulos_financeiros', 'empresa_id'],
      ['contas_bancarias', 'saldo_inicial'],
      ['contas_bancarias', 'exige_abertura_fechamento'],
      ['contas_bancarias', 'tipo_operacional'],
      ['contas_bancarias', 'empresa_id']
    ];

    for (const [tableName, columnName] of columns) {
      if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, columnName)) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    }

    if (await tableExists(sequelize, 'empresas_grupo')) {
      await queryInterface.dropTable('empresas_grupo');
    }
  }
};
