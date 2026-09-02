// Filtros nomeados criados pelo usuário nas listas (ListaAvancada).
// Conteúdo do usuário — vive no banco para sobreviver a troca de
// dispositivo/navegador. JSON serializado em `filtros`.
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('UsuarioListaFiltro', {
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
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    filtros: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'usuario_lista_filtros',
    timestamps: true
  });
};
