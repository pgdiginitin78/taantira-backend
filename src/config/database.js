const env = require('./env');

const baseConfig = {
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4',
    decimalNumbers: true,
  },
  pool: {
    max: env.db.poolMax,
    min: env.db.poolMin,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  logging: false,
};

module.exports = {
  development: baseConfig,
  test: {
    ...baseConfig,
    database: process.env.DB_TEST_NAME || `${env.db.database}_test`,
  },
  production: {
    ...baseConfig,
    logging: false,
  },
};
