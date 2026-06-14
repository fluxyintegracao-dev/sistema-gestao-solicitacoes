module.exports = (sequelize, DataTypes) => sequelize.define(
  'ContaBancaria',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo_operacional: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'BANCARIA'
    },
    banco: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    agencia: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    conta: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    ofx_bank_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    ofx_branch_id: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    ofx_account_id: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    tipo_conta: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    exige_abertura_fechamento: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    saldo_inicial: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    atualizado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'contas_bancarias',
    timestamps: true
  }
);
