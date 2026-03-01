const { promisePool } = require('../utils/database');

class WithdrawRequestModel {
  async create(data) {
    const sql = `INSERT INTO withdraw_request (user_id, withdrawal_address, token, busd_amount, status) 
                 VALUES (?, ?, ?, ?, 0)`;
    const [result] = await promisePool.query(sql, [
      data.user_id,
      data.withdrawal_address,
      data.token,
      data.busd_amount,
    ]);
    return result;
  }

  async listByUser(data) {
    const sql = 'SELECT * FROM withdraw_request WHERE user_id = ? ORDER BY id DESC';
    const [rows] = await promisePool.query(sql, [data.user_id]);
    return rows;
  }
}

module.exports = new WithdrawRequestModel();
