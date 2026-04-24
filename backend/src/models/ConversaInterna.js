module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ConversaInterna', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    assunto: {
      type: DataTypes.STRING,
      allowNull: false
    },

    criado_por_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    destinatario_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    is_group: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    setor_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    status: {
      type: DataTypes.ENUM('ABERTA', 'CONCLUIDA'),
      allowNull: false,
      defaultValue: 'ABERTA'
    },

    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    last_message_preview: {
      type: DataTypes.STRING(500),
      allowNull: true
    },

    concluida_por_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    concluida_em: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'conversas_internas',
    timestamps: true
  });
};
