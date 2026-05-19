module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalCompany',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    razao_social: { type: DataTypes.STRING(200), allowNull: false },
    nome_fantasia: { type: DataTypes.STRING(200), allowNull: true },
    cnpj: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    uf: { type: DataTypes.STRING(2), allowNull: false },
    inscricao_estadual: { type: DataTypes.STRING(40), allowNull: true },
    ambiente_sefaz: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'homologacao' },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    modulo_fiscal_habilitado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: 'fiscal_companies',
    timestamps: true
  }
);
