'use strict';

// Torna apropriacao_id, unidade_sigla_manual e especificacao anulaveis
// para suportar cotacoes avulsas (sem fluxo de aprovacao/apropriacao)

module.exports = {
  async up({ queryInterface, DataTypes }) {
    // Remove FK constraint antes de alterar a coluna
    // MySQL nao permite ALTER em coluna com FK sem antes dropa-la
    try {
      await queryInterface.removeConstraint(
        'solicitacao_compra_itens_manuais',
        'solicitacao_compra_itens_manuais_ibfk_2'
      );
    } catch {
      // FK pode ter nome diferente — tenta via SQL direto
      try {
        const [constraints] = await queryInterface.sequelize.query(`
          SELECT CONSTRAINT_NAME
          FROM information_schema.TABLE_CONSTRAINTS
          WHERE TABLE_NAME = 'solicitacao_compra_itens_manuais'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND TABLE_SCHEMA = DATABASE()
        `);
        for (const c of constraints) {
          if (String(c.CONSTRAINT_NAME).includes('apropriacao')) {
            await queryInterface.sequelize.query(
              `ALTER TABLE solicitacao_compra_itens_manuais DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``
            );
          }
        }
      } catch {
        // ignora se nao existir
      }
    }

    await queryInterface.changeColumn('solicitacao_compra_itens_manuais', 'apropriacao_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await queryInterface.changeColumn('solicitacao_compra_itens_manuais', 'unidade_sigla_manual', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('solicitacao_compra_itens_manuais', 'especificacao', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  async down({ queryInterface, DataTypes }) {
    await queryInterface.changeColumn('solicitacao_compra_itens_manuais', 'apropriacao_id', {
      type: DataTypes.INTEGER,
      allowNull: false
    });
    await queryInterface.changeColumn('solicitacao_compra_itens_manuais', 'unidade_sigla_manual', {
      type: DataTypes.STRING,
      allowNull: false
    });
    await queryInterface.changeColumn('solicitacao_compra_itens_manuais', 'especificacao', {
      type: DataTypes.TEXT,
      allowNull: false
    });
  }
};
