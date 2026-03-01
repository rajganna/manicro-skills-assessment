const logger = require('../utils/logger');
const { ensureBaseTables } = require('../utils/schema');
const { pool } = require('../utils/database');

async function main() {
  try {
    await ensureBaseTables();
    logger.info('Database schema initialized (users, transaction, auth_users).');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize database schema:', error);
    process.exit(1);
  } finally {
    try {
      pool.end();
    } catch (_error) {
      // noop
    }
  }
}

main();
