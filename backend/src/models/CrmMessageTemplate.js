module.exports = (sequelize, DataTypes) => {
  const CrmMessageTemplate = sequelize.define('CrmMessageTemplate', {
    nome: { type: DataTypes.STRING(160), allowNull: false },
    channel_type: {
      type: DataTypes.ENUM('WHATSAPP', 'PHONE', 'EMAIL', 'FORM', 'CHAT', 'OTHER'),
      allowNull: false,
      defaultValue: 'WHATSAPP'
    },
    categoria: { type: DataTypes.STRING(80), allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by_user_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'crm_message_templates',
    timestamps: true
  });

  return CrmMessageTemplate;
};
