const { promisePool } = require('../utils/database');

class AdminModel {
  async getWithdrawRequest() {
    const sql = 'SELECT * FROM withdraw_request ORDER BY id DESC';
    const [result] = await promisePool.query(sql);
    return result;
  }

  async approveWithdrawRequest(data) {
    const sql = 'UPDATE withdraw_request SET status = 1, hash = ? WHERE id = ?';
    const [result] = await promisePool.query(sql, [data.hash, data.id]);
    return result;
  }

  async rejectWithdrawRequest(data) {
    const sql = 'UPDATE withdraw_request SET status = 2 WHERE id = ?';
    const [result] = await promisePool.query(sql, [data.request_id]);
    return result;
  }

  async balanceUpdate(data) {
    const sql = 'UPDATE users SET token_balance = token_balance + ? WHERE id = ?';
    const [result] = await promisePool.query(sql, [data.token_amount, data.user_id]);
    return result;
  }

  async getUserList() {
    const sql = `SELECT id, address, referral_code, token_balance, MBUSD_balance, datetime 
                 FROM users WHERE is_admin = 0 ORDER BY id DESC`;
    const [result] = await promisePool.query(sql);
    return result;
  }

  async getStakingDetail() {
    const sql = `SELECT s.token_amount, s.staking_period_id, s.staking_percentage, s.staking_duration, 
                 s.reward_token, s.remaining_quantity, s.is_claim, s.status, u.address, s.created_date, sp.plan_name 
                 FROM staking AS s 
                 LEFT JOIN users AS u ON u.id = s.user_id 
                 LEFT JOIN staking_period AS sp ON sp.id = s.staking_period_id 
                 ORDER BY s.created_date DESC`;
    const [result] = await promisePool.query(sql);
    return result;
  }

  async getStakingEarningDetail() {
    const sql = `SELECT se.reward_token, se.is_claim, se.status, se.datetime, s.staking_period_id, u.address, 
                 s.staking_duration, s.token_amount, s.remaining_quantity, s.reward_token AS perreward, sp.plan_name 
                 FROM staking_earning AS se 
                 LEFT JOIN users AS u ON u.id = se.user_id 
                 LEFT JOIN staking AS s ON s.id = se.staking_id 
                 LEFT JOIN staking_period AS sp ON sp.id = s.staking_period_id 
                 ORDER BY se.id DESC`;
    const [result] = await promisePool.query(sql);
    return result;
  }

  async getDepositBUSDDetail() {
    const sql = `SELECT address, from_address, to_address, hash, busd_amount, token, status, datetime 
                 FROM transaction WHERE transaction_type_id = 1 ORDER BY id DESC`;
    const [result] = await promisePool.query(sql);
    return result;
  }
}

module.exports = new AdminModel();
