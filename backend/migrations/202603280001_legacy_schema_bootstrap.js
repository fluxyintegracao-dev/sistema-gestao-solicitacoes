const db = require('../src/models');
const {
  refreshLegacyModelAttributes,
  runLegacySchemaBootstrap
} = require('../src/database/legacyBootstrap');

module.exports = {
  async up() {
    await runLegacySchemaBootstrap(db);
    refreshLegacyModelAttributes(db);
    await db.sequelize.sync();
    await runLegacySchemaBootstrap(db);
  }
};
