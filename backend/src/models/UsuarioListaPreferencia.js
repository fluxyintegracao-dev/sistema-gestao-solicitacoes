// Preferências de exibição das listas (ListaAvancada), por usuário e por
// lista: colunas visíveis, larguras, modo tabela/cards, paginação,
// agrupamento. JSON serializado em `preferencias`.
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('UsuarioListaPreferencia', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    lista: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    preferencias: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'usuario_lista_preferencias',
    timestamps: true
  });
};
