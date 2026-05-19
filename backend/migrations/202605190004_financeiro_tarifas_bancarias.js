const { columnExists, tableExists } = require('../src/database/schemaUtils');

const CONFIG_KEY = 'FINANCEIRO_TARIFAS_BANCARIAS_ATALHOS';
const DEFAULT_TARIFAS = [
  { codigo: 'TAR_PIX', nome: 'TAR PIX', ativo: true },
  { codigo: 'TAR_TED', nome: 'TAR TED', ativo: true },
  { codigo: 'TAR_TEV', nome: 'TAR TEV', ativo: true },
  { codigo: 'TAR_MAN_CONT', nome: 'TAR MAN CONT', ativo: true }
];

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    if (await tableExists(sequelize, 'movimentos_financeiros') && await columnExists(sequelize, 'movimentos_financeiros', 'titulo_financeiro_id')) {
      await queryInterface.changeColumn('movimentos_financeiros', 'titulo_financeiro_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (await tableExists(sequelize, 'configuracoes_sistema')) {
      const [rows] = await sequelize.query(
        'SELECT id FROM configuracoes_sistema WHERE chave = ? LIMIT 1',
        { replacements: [CONFIG_KEY] }
      );

      if (!rows.length) {
        await queryInterface.bulkInsert('configuracoes_sistema', [{
          chave: CONFIG_KEY,
          valor: JSON.stringify(DEFAULT_TARIFAS),
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      }
    }
  },

  async down({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    if (await tableExists(sequelize, 'configuracoes_sistema')) {
      await sequelize.query('DELETE FROM configuracoes_sistema WHERE chave = ?', {
        replacements: [CONFIG_KEY]
      });
    }

    if (await tableExists(sequelize, 'movimentos_financeiros') && await columnExists(sequelize, 'movimentos_financeiros', 'titulo_financeiro_id')) {
      await queryInterface.changeColumn('movimentos_financeiros', 'titulo_financeiro_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      });
    }
  }
};
