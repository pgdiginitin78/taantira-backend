const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../src/models');

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === 'true';

test(
  'Live MySQL connectivity and seeded schema verification (set RUN_DB_TESTS=true when MySQL is running)',
  { skip: !RUN_DB_TESTS },
  async () => {
    await sequelize.authenticate();
    const [rows] = await sequelize.query('SELECT COUNT(*) AS cnt FROM products');
    assert.ok(Number(rows[0].cnt) >= 1, 'Expected seeded products in MySQL');
    await sequelize.close();
  }
);
