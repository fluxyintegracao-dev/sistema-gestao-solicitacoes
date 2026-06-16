module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompra = sequelize.define(
    'SolicitacaoCompra',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      origem: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'NORMAL'
      },
      titulo: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: true
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
      },
      comprador_responsavel_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      prazo_compra: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      delegado_por: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      delegado_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      motivo_atraso: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      motivo_atraso_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      valor_fechado: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: 'solicitacao_compras',
      timestamps: true
    }
  );

  return SolicitacaoCompra;
};
