const { columnExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (await columnExists(sequelize, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function removeColumnIfExists(queryInterface, sequelize, tableName, columnName) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (!(await columnExists(sequelize, tableName, columnName))) return;
  await queryInterface.removeColumn(tableName, columnName);
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    if (await tableExists(sequelize, 'crm_integration_meta_events')) {
      await sequelize.query(`
        ALTER TABLE crm_integration_meta_events
        MODIFY processing_status ENUM('PENDING','PROCESSING','PROCESSED','DUPLICATE','ERROR','IGNORED') NOT NULL DEFAULT 'PENDING'
      `);

      await addColumnIfMissing(queryInterface, sequelize, 'crm_integration_meta_events', 'ad_id', {
        type: DataTypes.STRING(120),
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, sequelize, 'crm_integration_meta_events', 'adset_id', {
        type: DataTypes.STRING(120),
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, sequelize, 'crm_integration_meta_events', 'campaign_id', {
        type: DataTypes.STRING(120),
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, sequelize, 'crm_integration_meta_events', 'meta_response_json', {
        type: DataTypes.JSON,
        allowNull: true
      });
    }

    if (await tableExists(sequelize, 'crm_config')) {
      await sequelize.query(`
        INSERT IGNORE INTO crm_config (chave, valor, descricao) VALUES
          ('CRM_META_PAGE_ACCESS_TOKEN', NULL, 'Page Access Token para consultar leadgen na Graph API da Meta'),
          ('CRM_META_GRAPH_API_VERSION', 'v20.0', 'Versao da Graph API usada na consulta de leads Meta'),
          ('CRM_META_PAGE_ID', NULL, 'Page ID opcional usado como referencia da integracao Meta')
      `);
    }
  },

  async down({ queryInterface, sequelize }) {
    if (await tableExists(sequelize, 'crm_integration_meta_events')) {
      await sequelize.query(`
        UPDATE crm_integration_meta_events
           SET processing_status = 'PENDING'
         WHERE processing_status = 'PROCESSING'
      `);
      await sequelize.query(`
        UPDATE crm_integration_meta_events
           SET processing_status = 'ERROR'
         WHERE processing_status = 'IGNORED'
      `);
      await sequelize.query(`
        ALTER TABLE crm_integration_meta_events
        MODIFY processing_status ENUM('PENDING','PROCESSED','DUPLICATE','ERROR') NOT NULL DEFAULT 'PENDING'
      `);
    }

    await removeColumnIfExists(queryInterface, sequelize, 'crm_integration_meta_events', 'meta_response_json');
    await removeColumnIfExists(queryInterface, sequelize, 'crm_integration_meta_events', 'campaign_id');
    await removeColumnIfExists(queryInterface, sequelize, 'crm_integration_meta_events', 'adset_id');
    await removeColumnIfExists(queryInterface, sequelize, 'crm_integration_meta_events', 'ad_id');

    if (await tableExists(sequelize, 'crm_config')) {
      await sequelize.query(`
        DELETE FROM crm_config
         WHERE chave IN ('CRM_META_PAGE_ACCESS_TOKEN', 'CRM_META_GRAPH_API_VERSION', 'CRM_META_PAGE_ID')
      `);
    }
  }
};
