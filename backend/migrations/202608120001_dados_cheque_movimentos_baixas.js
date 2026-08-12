'use strict';

const { columnExists, tableExists } = require('../src/database/schemaUtils');

const columns = {
  cheque_numero: { type: 'STRING', length: 60 },
  cheque_emitente: { type: 'STRING', length: 160 },
  cheque_titular_documento: { type: 'STRING', length: 40 },
  cheque_banco: { type: 'STRING', length: 120 },
  cheque_agencia: { type: 'STRING', length: 40 },
  cheque_conta: { type: 'STRING', length: 60 },
  cheque_data_emissao: { type: 'DATEONLY' },
  cheque_data_vencimento: { type: 'DATEONLY' }
};

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    for (const table of ['movimentos_financeiros', 'baixas_financeiras_componentes']) {
      if (!(await tableExists(sequelize, table))) continue;
      for (const [name, definition] of Object.entries(columns)) {
        if (await columnExists(sequelize, table, name)) continue;
        await queryInterface.addColumn(table, name, {
          type: definition.type === 'DATEONLY'
            ? DataTypes.DATEONLY
            : DataTypes.STRING(definition.length),
          allowNull: true
        });
      }
    }
  },

  async down() {
    // Sem rollback destrutivo: os dados identificam os cheques usados nas baixas.
  }
};
