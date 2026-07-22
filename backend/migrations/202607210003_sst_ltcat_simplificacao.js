'use strict';

async function tableExists(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  async up({ DataTypes, queryInterface }) {
    if (!(await tableExists(queryInterface, 'sst_ltcats'))) {
      await queryInterface.createTable('sst_ltcats', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        empresa_id: { type: DataTypes.INTEGER, allowNull: false },
        obra_id: { type: DataTypes.INTEGER, allowNull: true },
        codigo: { type: DataTypes.STRING(60), allowNull: true },
        titulo: { type: DataTypes.STRING(180), allowNull: false },
        data_emissao: { type: DataTypes.DATEONLY, allowNull: true },
        vigencia_inicio: { type: DataTypes.DATEONLY, allowNull: true },
        vigencia_fim: { type: DataTypes.DATEONLY, allowNull: true },
        status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'RASCUNHO' },
        responsavel_tecnico: { type: DataTypes.STRING(180), allowNull: true },
        observacoes: { type: DataTypes.TEXT, allowNull: true },
        documento_url: { type: DataTypes.TEXT, allowNull: true },
        ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        criado_por: { type: DataTypes.INTEGER, allowNull: true },
        atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false }
      });
      await queryInterface.addIndex('sst_ltcats', ['empresa_id', 'status'], { name: 'idx_sst_ltcats_empresa_status' });
      await queryInterface.addIndex('sst_ltcats', ['obra_id'], { name: 'idx_sst_ltcats_obra' });
    }

    if (!(await tableExists(queryInterface, 'sst_ltcat_avaliacoes'))) {
      await queryInterface.createTable('sst_ltcat_avaliacoes', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        ltcat_id: { type: DataTypes.INTEGER, allowNull: false },
        empresa_id: { type: DataTypes.INTEGER, allowNull: false },
        obra_id: { type: DataTypes.INTEGER, allowNull: true },
        colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
        ambiente: { type: DataTypes.STRING(180), allowNull: false },
        agente: { type: DataTypes.STRING(180), allowNull: false },
        tipo_agente: { type: DataTypes.STRING(60), allowNull: true },
        metodologia: { type: DataTypes.STRING(180), allowNull: true },
        unidade_medida: { type: DataTypes.STRING(40), allowNull: true },
        valor_medido: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
        limite_tolerancia: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
        nivel_acao: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
        resultado: { type: DataTypes.STRING(60), allowNull: true },
        data_avaliacao: { type: DataTypes.DATEONLY, allowNull: true },
        observacoes: { type: DataTypes.TEXT, allowNull: true },
        ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        criado_por: { type: DataTypes.INTEGER, allowNull: true },
        atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false }
      });
      await queryInterface.addIndex('sst_ltcat_avaliacoes', ['ltcat_id'], { name: 'idx_sst_ltcat_avaliacoes_ltcat' });
      await queryInterface.addIndex('sst_ltcat_avaliacoes', ['empresa_id', 'data_avaliacao'], { name: 'idx_sst_ltcat_avaliacoes_empresa_data' });
    }
  },

  async down() {
    // Estrutura aditiva: rollback destrutivo somente de forma assistida.
  }
};
