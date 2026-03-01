const { promisePool } = require('../utils/database');

class TransactionModel {
  async listByUser(data) {
    const sql = 'SELECT * FROM transaction WHERE user_id = ? ORDER BY id DESC';
    const [rows] = await promisePool.query(sql, [data.user_id]);
    return rows;
  }
}

module.exports = new TransactionModel();
