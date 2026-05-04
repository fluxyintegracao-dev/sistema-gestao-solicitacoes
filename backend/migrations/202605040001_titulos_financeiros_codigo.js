const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize, DataTypes, queryInterface }) {
    if (await tableExists(sequelize, 'titulos_financeiros')) {
      if (!(await columnExists(sequelize, 'titulos_financeiros', 'codigo'))) {
        await queryInterface.addColumn('titulos_financeiros', 'codigo', {
          type: DataTypes.STRING(40),
          allowNull: true,
          unique: false,
          after: 'id'
        });
      }

      await sequelize.query(`
        SELECT @titulo_financeiro_codigo_seq := COALESCE(MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)), 0)
          FROM titulos_financeiros
         WHERE codigo REGEXP '^TIT-[0-9]+$'
      `);
      await sequelize.query(`
        UPDATE titulos_financeiros tf
        JOIN (
          SELECT ordenados.id,
                 CONCAT('TIT-', LPAD(@titulo_financeiro_codigo_seq := @titulo_financeiro_codigo_seq + 1, 6, '0')) AS novo_codigo
            FROM (
              SELECT id
                FROM titulos_financeiros
               WHERE codigo IS NULL OR codigo = ''
               ORDER BY id ASC
            ) ordenados
        ) sequencia ON sequencia.id = tf.id
           SET tf.codigo = sequencia.novo_codigo
         WHERE tf.codigo IS NULL OR tf.codigo = ''
      `);

      if (!(await indexExists(sequelize, 'titulos_financeiros', 'uq_titulos_financeiros_codigo'))) {
        await queryInterface.addIndex('titulos_financeiros', ['codigo'], {
          name: 'uq_titulos_financeiros_codigo',
          unique: true
        });
      }
    }

    if (!(await tableExists(sequelize, 'titulo_financeiro_sequencias'))) {
      await queryInterface.createTable('titulo_financeiro_sequencias', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        chave: {
          type: DataTypes.STRING(80),
          allowNull: false,
          unique: true
        },
        ultimo_numero: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      });
    }

    if (
      (await tableExists(sequelize, 'titulo_financeiro_sequencias')) &&
      (await tableExists(sequelize, 'titulos_financeiros'))
    ) {
      const [rows] = await sequelize.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)), 0) AS ultimo_numero
          FROM titulos_financeiros
         WHERE codigo REGEXP '^TIT-[0-9]+$'
      `);
      const ultimoNumero = Number(rows?.[0]?.ultimo_numero || 0);

      await sequelize.query(`
        INSERT INTO titulo_financeiro_sequencias (chave, ultimo_numero, createdAt, updatedAt)
        VALUES ('GLOBAL', ${sequelize.escape(ultimoNumero)}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          ultimo_numero = GREATEST(ultimo_numero, VALUES(ultimo_numero)),
          updatedAt = NOW()
      `);
    }
  },

  async down({ sequelize, queryInterface }) {
    if (await tableExists(sequelize, 'titulo_financeiro_sequencias')) {
      await queryInterface.dropTable('titulo_financeiro_sequencias');
    }

    if (await tableExists(sequelize, 'titulos_financeiros')) {
      if (await indexExists(sequelize, 'titulos_financeiros', 'uq_titulos_financeiros_codigo')) {
        await queryInterface.removeIndex('titulos_financeiros', 'uq_titulos_financeiros_codigo');
      }

      if (await columnExists(sequelize, 'titulos_financeiros', 'codigo')) {
        await queryInterface.removeColumn('titulos_financeiros', 'codigo');
      }
    }
  }
};
