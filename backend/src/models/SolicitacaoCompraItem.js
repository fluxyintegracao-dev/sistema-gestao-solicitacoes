module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraItem = sequelize.define(
    'SolicitacaoCompraItem',
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
      insumo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      unidade_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      unidade_sigla_manual: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      apropriacao_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      quantidade: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      especificacao: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      necessario_para: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      link_produto: {
        type: DataTypes.STRING,
        allowNull: true
      },
      arquivo_url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      arquivo_nome_original: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      tableName: 'solicitacao_compra_itens',
      timestamps: true
    }
  );

  return SolicitacaoCompraItem;
};
