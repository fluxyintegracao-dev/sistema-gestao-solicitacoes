module.exports = (sequelize, DataTypes) => {
  const TreinamentoConteudo = sequelize.define('TreinamentoConteudo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'GUIA' },
    modulo: { type: DataTypes.STRING(60), allowNull: true },
    publico_alvo: { type: DataTypes.STRING(120), allowNull: true },
    titulo: { type: DataTypes.STRING(180), allowNull: false },
    pergunta: { type: DataTypes.TEXT, allowNull: true },
    resposta: { type: DataTypes.TEXT, allowNull: true },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    conteudo: { type: DataTypes.TEXT('long'), allowNull: true },
    tags_json: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'RASCUNHO' },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    video_url: { type: DataTypes.TEXT, allowNull: true },
    video_s3_key: { type: DataTypes.TEXT, allowNull: true },
    documento_url: { type: DataTypes.TEXT, allowNull: true },
    documento_s3_key: { type: DataTypes.TEXT, allowNull: true },
    thumbnail_url: { type: DataTypes.TEXT, allowNull: true },
    duracao_minutos: { type: DataTypes.INTEGER, allowNull: true },
    publicado_em: { type: DataTypes.DATE, allowNull: true },
    publicado_por: { type: DataTypes.INTEGER, allowNull: true },
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'treinamento_conteudos',
    timestamps: true
  });

  return TreinamentoConteudo;
};
