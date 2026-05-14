module.exports = {
  async up({ DataTypes, queryInterface }) {
    await queryInterface.addColumn('prioridade_lotes', 'tipo_lote', {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'DIR_ADMIN'
    });

    await queryInterface.addColumn('prioridade_lotes', 'setor_criador_codigo', {
      type: DataTypes.STRING(120),
      allowNull: true
    });

    await queryInterface.addColumn('prioridade_lotes', 'setor_criador_nome', {
      type: DataTypes.STRING(180),
      allowNull: true
    });
  }
};
