module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentJob',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    job_type: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dedupe_key: {
      type: DataTypes.STRING(180),
      allowNull: true,
      unique: true
    },
    requested_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDENTE'
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    next_run_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    locked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    locked_by: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'payment_jobs',
    timestamps: true
  }
);
