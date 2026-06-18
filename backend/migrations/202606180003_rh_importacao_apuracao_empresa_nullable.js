module.exports = {
  async up({ sequelize }) {
    await sequelize.query('ALTER TABLE rh_importacoes MODIFY empresa_grupo_id INT NULL');
    await sequelize.query('ALTER TABLE rh_apuracoes MODIFY empresa_grupo_id INT NULL');
  },

  async down({ sequelize }) {
    await sequelize.query('ALTER TABLE rh_importacoes MODIFY empresa_grupo_id INT NOT NULL');
    await sequelize.query('ALTER TABLE rh_apuracoes MODIFY empresa_grupo_id INT NOT NULL');
  }
};
