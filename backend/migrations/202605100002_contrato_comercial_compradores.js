const { indexExists, tableExists } = require('../src/database/schemaUtils');

async function addIndexIfMissing(queryInterface, sequelize, tableName, indexName, fields, options = {}) {
  if (await indexExists(sequelize, tableName, indexName)) return;
  await queryInterface.addIndex(tableName, fields, { name: indexName, ...options });
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const hasContratos = await tableExists(sequelize, 'contratos_comerciais');
    const hasParceiros = await tableExists(sequelize, 'parceiros');
    if (!hasContratos || !hasParceiros) return;

    if (!(await tableExists(sequelize, 'contrato_comercial_compradores'))) {
      await queryInterface.createTable('contrato_comercial_compradores', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        contrato_comercial_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'contratos_comerciais',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        parceiro_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'parceiros',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        ordem: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        principal: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        percentual_participacao: {
          type: DataTypes.DECIMAL(8, 4),
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'contrato_comercial_compradores',
      'idx_contrato_comercial_compradores_contrato',
      ['contrato_comercial_id']
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'contrato_comercial_compradores',
      'idx_contrato_comercial_compradores_parceiro',
      ['parceiro_id']
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'contrato_comercial_compradores',
      'uk_contrato_comercial_compradores_contrato_parceiro',
      ['contrato_comercial_id', 'parceiro_id'],
      { unique: true }
    );

    await sequelize.query(`
      INSERT INTO contrato_comercial_compradores
        (contrato_comercial_id, parceiro_id, ordem, principal, percentual_participacao, createdAt, updatedAt)
      SELECT c.id, c.parceiro_id, 1, TRUE, 100, NOW(), NOW()
      FROM contratos_comerciais c
      WHERE c.parceiro_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM contrato_comercial_compradores cc
          WHERE cc.contrato_comercial_id = c.id
            AND cc.parceiro_id = c.parceiro_id
        )
    `);
  },

  async down({ queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'contrato_comercial_compradores'))) return;
    await queryInterface.dropTable('contrato_comercial_compradores');
  }
};
