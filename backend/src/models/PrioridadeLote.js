module.exports = (sequelize, DataTypes) => {
  const PrioridadeLote = sequelize.define(
    'PrioridadeLote',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      classificacao_alvo: {
        type: DataTypes.ENUM('PUBLICA', 'PRIVADA'),
        allowNull: false
      },
      diretoria_alvo_codigo: {
        type: DataTypes.STRING,
        allowNull: false
      },
      tipo_lote: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'DIR_ADMIN'
      },
      setor_criador_codigo: {
        type: DataTypes.STRING,
        allowNull: true
      },
      setor_criador_nome: {
        type: DataTypes.STRING,
        allowNull: true
      },
      valor_disponivel: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      valor_utilizado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ABERTO'
      },
      observacao: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      solicitado_por: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      finalizado_por: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      finalizado_em: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'prioridade_lotes',
      timestamps: true
    }
  );

  return PrioridadeLote;
};
