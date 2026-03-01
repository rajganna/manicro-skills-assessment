const mysql = require('mysql2');
const config = require('../config');
const logger = require('./logger');

const pool = mysql.createPool({
  host: config.mysqlHost,
  user: config.user,
  password: config.password,
  database: config.database,
  port: config.mysqlPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

const promisePool = pool.promise();

pool.on('connection', () => {
  logger.debug('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Database connection error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    logger.error('Database connection was closed.');
  }
  if (err.code === 'ER_CON_COUNT_ERROR') {
    logger.error('Database has too many connections.');
  }
  if (err.code === 'ECONNREFUSED') {
    logger.error('Database connection was refused.');
  }
});

module.exports = {
  pool,
  promisePool,
};
