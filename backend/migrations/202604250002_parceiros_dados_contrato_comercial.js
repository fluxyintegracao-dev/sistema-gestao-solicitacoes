const { columnExists, tableExists } = require('../src/database/schemaUtils');

const COLUMNS = [
  ['rg', { type: 'STRING', length: 40, allowNull: true }],
  ['data_nascimento', { type: 'DATEONLY', allowNull: true }],
  ['nacionalidade', { type: 'STRING', length: 80, allowNull: true }],
  ['profissao', { type: 'STRING', length: 120, allowNull: true }],
  ['estado_civil', { type: 'STRING', length: 60, allowNull: true }],
  ['complemento', { type: 'STRING', length: 120, allowNull: true }],
  ['conjuge_nome', { type: 'STRING', length: 255, allowNull: true }],
  ['regime_bens', { type: 'STRING', length: 120, allowNull: true }],
  ['creci', { type: 'STRING', length: 60, allowNull: true }]
];

function resolveType(DataTypes, definition) {
  if (definition.type === 'STRING') {
    return DataTypes.STRING(definition.length);
  }

  return DataTypes[definition.type];
}

module.exports = {
  async up({ sequelize, DataTypes, queryInterface }) {
    if (!(await tableExists(sequelize, 'parceiros'))) {
      return;
    }

    for (const [column, definition] of COLUMNS) {
      if (!(await columnExists(sequelize, 'parceiros', column))) {
        await queryInterface.addColumn('parceiros', column, {
          type: resolveType(DataTypes, definition),
          allowNull: definition.allowNull
        });
      }
    }
  },

  async down({ sequelize, queryInterface }) {
    if (!(await tableExists(sequelize, 'parceiros'))) {
      return;
    }

    for (const [column] of [...COLUMNS].reverse()) {
      if (await columnExists(sequelize, 'parceiros', column)) {
        await queryInterface.removeColumn('parceiros', column);
      }
    }
  }
};
