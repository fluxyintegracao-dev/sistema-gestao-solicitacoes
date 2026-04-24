const { Sequelize } = require('sequelize');
const { env } = require('../config/env');

const sequelize = new Sequelize(
  env.dbName,
  env.dbUser,
  env.dbPassword,
  {
    host: env.dbHost,
    port: env.dbPort,
    dialect: 'mysql',
    logging: false,
  }
);

module.exports = sequelize;
