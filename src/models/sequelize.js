const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');
const env = require('../config/env');
const dbConfig = require('../config/database');

const activeConfig = dbConfig[env.nodeEnv] || dbConfig.development;

const sequelize = new Sequelize(
  activeConfig.database,
  activeConfig.username,
  activeConfig.password,
  {
    ...activeConfig,
    dialectModule: mysql2,
  }
);

module.exports = sequelize;
