module.exports = (sequelize, DataTypes) => sequelize.define(
  'UsuarioSetor',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    setor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: 'usuario_setores',
    timestamps: true,
    indexes: [
      {
        name: 'usuario_setores_user_setor_unique',
        unique: true,
        fields: ['user_id', 'setor_id']
      }
    ]
  }
);
