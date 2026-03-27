module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraLog = sequelize.define(
    'SolicitacaoCompraLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      solicitacao_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      fornecedor_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      tipo_acao: {
        type: DataTypes.STRING,
        allowNull: false
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      metadados: {
        type: DataTypes.TEXT('long'),
        allowNull: true
      }
    },
    {
      tableName: 'solicitacao_compra_logs',
      timestamps: true,
      updatedAt: false
    }
  );

  return SolicitacaoCompraLog;
};
