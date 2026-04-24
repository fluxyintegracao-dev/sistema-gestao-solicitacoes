module.exports = (sequelize, DataTypes) => {
  const SecurityEventLog = sequelize.define(
    'SecurityEventLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      tipo_evento: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      recurso_tipo: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      recurso_id: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'INFO'
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      ip_origem: {
        type: DataTypes.STRING(80),
        allowNull: true
      },
      user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      }
    },
    {
      tableName: 'security_event_logs',
      timestamps: true
    }
  );

  return SecurityEventLog;
};
