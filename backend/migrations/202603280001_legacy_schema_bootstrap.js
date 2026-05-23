const db = require('../src/models');
const {
  refreshLegacyModelAttributes,
  runLegacySchemaBootstrap
} = require('../src/database/legacyBootstrap');

module.exports = {
  async up() {
    const allowLegacySync = String(process.env.ALLOW_LEGACY_SCHEMA_BOOTSTRAP_SYNC || '')
      .trim()
      .toLowerCase() === 'true';

    await runLegacySchemaBootstrap(db);
    refreshLegacyModelAttributes(db);

    if (!allowLegacySync) {
      console.warn(
        'Migration 202603280001_legacy_schema_bootstrap: sequelize.sync() ignorado. ' +
        'Use ALLOW_LEGACY_SCHEMA_BOOTSTRAP_SYNC=true apenas em bootstrap legado controlado.'
      );
      return;
    }

    await db.sequelize.sync();
    await runLegacySchemaBootstrap(db);
  }
};
