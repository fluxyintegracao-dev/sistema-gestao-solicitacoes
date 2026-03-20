const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || '',
  process.env.DB_USER || '',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'gestao-solicitacoes-db.cn820k66sdx7.us-east-2.rds.amazonaws.com',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 20),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 60000),
      idle: Number(process.env.DB_POOL_IDLE_MS || 10000),
      evict: Number(process.env.DB_POOL_EVICT_MS || 1000)
    },
  }
);

module.exports = sequelize;
