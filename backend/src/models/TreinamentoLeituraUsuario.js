module.exports = (sequelize, DataTypes) => {
  const TreinamentoLeituraUsuario = sequelize.define('TreinamentoLeituraUsuario', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conteudo_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    concluido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    visualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    concluido_em: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'treinamento_leituras_usuario',
    timestamps: true
  });

  return TreinamentoLeituraUsuario;
};
