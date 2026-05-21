module.exports = (sequelize, DataTypes) => sequelize.define(
  'EmpresaGrupo',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    nome: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    razao_social: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    cnpj: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    tipo_empresa: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'OPERACIONAL'
    },
    tipo_gerencial: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'OPERACIONAL'
    },
    empresa_caixa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    empresa_operacional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    consolidar_no_grupo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    elimina_intercompany: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    holding_id: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    tableName: 'empresas_grupo',
    timestamps: true
  }
);
