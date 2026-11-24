const { Sequelize } = require('sequelize');
const env = require('../config/env');
const dbConfig = require('../config/database');

const activeConfig = dbConfig[env.nodeEnv] || dbConfig.development;

const sequelize = new Sequelize(
  activeConfig.database,
  activeConfig.username,
  activeConfig.password,
  activeConfig
);

module.exports = sequelize;
