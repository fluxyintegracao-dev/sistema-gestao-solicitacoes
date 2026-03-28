module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompra = sequelize.define(
    'SolicitacaoCompra',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      solicitante_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      solicitacao_principal_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ENVIADO'
      },
      numero_sienge: {
        type: DataTypes.STRING,
        allowNull: true
      },
      integrado_sienge: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      data_integracao_sienge: {
        type: DataTypes.DATE,
        allowNull: true
      },
      liberado_para_compra_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      encerrado_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      necessario_para: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      link_geral: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      tableName: 'solicitacao_compras',
      timestamps: true
    }
  );

  return SolicitacaoCompra;
};
