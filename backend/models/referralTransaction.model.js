const { promisePool } = require('../utils/database');

class ReferralTransactionModel {
  async listByUser(data) {
    const sql = 'SELECT * FROM transaction WHERE transaction_type_id = 4 AND user_id = ? ORDER BY id DESC';
    const [rows] = await promisePool.query(sql, [data.user_id]);
    return rows;
  }
}

module.exports = new ReferralTransactionModel();
