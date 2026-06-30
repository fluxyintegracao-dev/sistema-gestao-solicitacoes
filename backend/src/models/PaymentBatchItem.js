module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentBatchItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payment_batch_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_intent_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sequencia: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'RASCUNHO'
    },
    valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    erro_codigo: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    erro_mensagem: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    comprovante_pdf_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    comprovante_hash: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    comprovante_gerado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_to_end_id: {
      type: DataTypes.STRING(160),
      allowNull: true
    },
    protocolo_banco: {
      type: DataTypes.STRING(160),
      allowNull: true
    },
    confirmado_banco_em: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'payment_batch_items',
    timestamps: true
  }
);
