module.exports = {
  async up({ DataTypes, queryInterface }) {
    const table = await queryInterface.describeTable('caixa_pagamento_convenios');

    if (!table.convenio_nome) {
      await queryInterface.addColumn('caixa_pagamento_convenios', 'convenio_nome', {
        type: DataTypes.STRING(160),
        allowNull: true
      });
    }

    if (!table.compromisso_codigo) {
      await queryInterface.addColumn('caixa_pagamento_convenios', 'compromisso_codigo', {
        type: DataTypes.STRING(30),
        allowNull: true
      });
    }

    if (!table.compromisso_nome) {
      await queryInterface.addColumn('caixa_pagamento_convenios', 'compromisso_nome', {
        type: DataTypes.STRING(160),
        allowNull: true
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable('caixa_pagamento_convenios');

    if (table.compromisso_nome) {
      await queryInterface.removeColumn('caixa_pagamento_convenios', 'compromisso_nome');
    }

    if (table.compromisso_codigo) {
      await queryInterface.removeColumn('caixa_pagamento_convenios', 'compromisso_codigo');
    }

    if (table.convenio_nome) {
      await queryInterface.removeColumn('caixa_pagamento_convenios', 'convenio_nome');
    }
  }
};
