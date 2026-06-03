module.exports = {
  async up({ sequelize }) {
    await sequelize.query('ALTER TABLE titulos_financeiros MODIFY obra_id INT NULL');
  },

  async down({ sequelize }) {
    await sequelize.query('ALTER TABLE titulos_financeiros MODIFY obra_id INT NOT NULL');
  }
};
