const { columnExists } = require('../src/database/schemaUtils');

const COLUMNS = [
  { name: 'pix_chave_fixa_1_tipo', definition: 'VARCHAR(20) NULL' },
  { name: 'pix_chave_fixa_1', definition: 'VARCHAR(255) NULL' },
  { name: 'pix_chave_fixa_2_tipo', definition: 'VARCHAR(20) NULL' },
  { name: 'pix_chave_fixa_2', definition: 'VARCHAR(255) NULL' },
  { name: 'pix_chave_variavel_tipo', definition: 'VARCHAR(20) NULL' },
  { name: 'pix_chave_variavel', definition: 'VARCHAR(255) NULL' }
];

module.exports = {
  async up({ sequelize }) {
    for (const column of COLUMNS) {
      if (!(await columnExists(sequelize, 'parceiros', column.name))) {
        await sequelize.query(`
          ALTER TABLE parceiros
          ADD COLUMN ${column.name} ${column.definition}
        `);
      }
    }
  },

  async down({ sequelize }) {
    for (const column of [...COLUMNS].reverse()) {
      if (await columnExists(sequelize, 'parceiros', column.name)) {
        await sequelize.query(`
          ALTER TABLE parceiros
          DROP COLUMN ${column.name}
        `);
      }
    }
  }
};
