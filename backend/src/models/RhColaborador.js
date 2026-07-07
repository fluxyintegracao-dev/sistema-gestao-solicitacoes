module.exports = (sequelize, DataTypes) => sequelize.define(
  'RhColaborador',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    empresa_grupo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    setor_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    nome: {
      type: DataTypes.STRING(180),
      allowNull: false
    },
    cpf: {
      type: DataTypes.STRING(14),
      allowNull: false
    },
    parceiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    matricula: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    rg: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    telefone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: true
    },
    cargo: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    tipo_vinculo: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    data_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    data_admissao: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    data_demissao: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    data_nascimento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ATIVO'
    },
    salario_base: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true
    },
    valor_contratual: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'rh_colaboradores',
    timestamps: true
  }
);
