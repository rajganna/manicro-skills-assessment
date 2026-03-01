const { promisePool } = require('../utils/database');

class UserModel {
  async getUsersDetailsAddress(data) {
    const sql = 'SELECT * FROM users WHERE address = ?';
    const [result] = await promisePool.query(sql, [data.address]);
    return result;
  }

  async getUserDetailsByAddress(referralCode) {
    const sql = 'SELECT * FROM users WHERE referral_code = ?';
    const [result] = await promisePool.query(sql, [referralCode]);
    return result;
  }

  async getUsersAddress(data) {
    const sql = 'SELECT * FROM users WHERE address = ?';
    const [result] = await promisePool.query(sql, [data.address]);
    return result;
  }

  async checkBalanceFromStaking(data) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const [result] = await promisePool.query(sql, [data.user_id]);
    return result;
  }

  async saveUserAddressDetails(data) {
    const sql = 'INSERT INTO users (address, referral_code, referral_id, is_admin) VALUES (?, ?, ?, ?)';
    const [result] = await promisePool.query(sql, [
      data.address,
      data.referral_code,
      data.referral_id || null,
      0,
    ]);
    return result;
  }

  async saveReferralTransaction(data, address) {
    const refBalance = parseFloat((data.amount * 5) / 100).toFixed(2);
    const sql = `INSERT INTO referral_transaction (address, to_address, amount, ref_balance, percentage, datetime) 
                 VALUES (?, ?, ?, ?, ?, NOW())`;
    const [result] = await promisePool.query(sql, [
      data.address,
      address,
      data.amount,
      refBalance,
      5,
    ]);
    return result;
  }

  async getPlanDetails() {
    const sql = 'SELECT * FROM staking_period ORDER BY id ASC';
    const [result] = await promisePool.query(sql);
    return result;
  }

  async checkHash(data) {
    const sql = 'SELECT id FROM transaction WHERE UPPER(hash) = UPPER(?)';
    const [result] = await promisePool.query(sql, [data.hash]);
    return result;
  }

  async saveDepositBUSDDetails(data) {
    const sql = `INSERT INTO transaction (user_id, address, from_address, to_address, hash, busd_amount, token, transaction_type_id, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`;
    const [result] = await promisePool.query(sql, [
      data.user_id,
      data.address,
      data.from_address,
      data.to_address,
      data.hash,
      data.busd_amount,
      data.token,
    ]);
    return result;
  }

  async checkPeriodId(data) {
    const sql = 'SELECT id, price, duration, token FROM staking_period WHERE id = ?';
    const [result] = await promisePool.query(sql, [data.staking_period_id]);
    return result;
  }

  async stakingQuantity(data) {
    const sql = `SELECT id, reward_token, remaining_quantity FROM staking 
                 WHERE id = ? AND staking_period_id = ? AND user_id = ?`;
    const [result] = await promisePool.query(sql, [
      data.staking_id,
      data.staking_period_id,
      data.user_id,
    ]);
    return result;
  }

  async addStaking(data) {
    const sql = `INSERT INTO staking (user_id, token_amount, busd_amount, staking_period_id, staking_duration, 
                 staking_percentage, reward_token, trx_hash, is_claim, status, quantity, remaining_quantity) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`;
    const [result] = await promisePool.query(sql, [
      data.user_id,
      data.token_amount,
      data.busd_amount,
      data.staking_period_id,
      data.staking_duration,
      data.staking_percentage,
      data.reward_token,
      data.hash,
      data.quantity,
      data.quantity,
    ]);

    const sql1 = `INSERT INTO transaction (user_id, address, staking_id, from_address, to_address, hash, 
                  busd_amount, token, transaction_type_id, status) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 9, 1)`;
    await promisePool.query(sql1, [
      data.user_id,
      data.address,
      result.insertId,
      data.from_address,
      data.to_address,
      data.hash,
      data.busd_amount,
      data.token_amount,
    ]);

    const mbusdBalance = parseFloat(data.token_amount * data.quantity);
    const sql2 = 'UPDATE users SET MBUSD_balance = MBUSD_balance - ? WHERE id = ?';
    await promisePool.query(sql2, [mbusdBalance, data.user_id]);

    return result;
  }

  async saveReferralIncome(data) {
    const newToken = parseFloat((data.token * 5) / 100);
    const sql = `INSERT INTO transaction (user_id, address, referred_by, busd_amount, token, referral_level, 
                 referral_trx_id, referral_percent, transaction_type_id, status) 
                 VALUES (?, ?, ?, ?, ?, 1, ?, 5, 4, 1)`;
    const [result] = await promisePool.query(sql, [
      data.user_id,
      data.address,
      data.referred_by,
      data.busd_amount,
      newToken,
      data.referred_by,
    ]);
    return result;
  }

  async getReferralUser(data) {
    const sql = 'SELECT * FROM users WHERE id = ? ORDER BY id ASC';
    const [result] = await promisePool.query(sql, [data]);
    return result;
  }

  async getTransactionHistory(data) {
    const sql = 'SELECT * FROM transaction WHERE user_id = ? AND transaction_type_id = 1 ORDER BY id DESC';
    const [result] = await promisePool.query(sql, [data.user_id]);
    return result;
  }

  async getWithdrawHistory(data) {
    const sql = `SELECT w.*, u.address FROM withdraw_request AS w 
                 LEFT JOIN users AS u ON u.id = w.user_id 
                 WHERE w.user_id = ? ORDER BY id DESC`;
    const [result] = await promisePool.query(sql, [data.user_id]);
    return result;
  }

  async getStakingHistory(data) {
    const sql = `SELECT *, COALESCE(totalReward(?, id), 0) AS totalreward, 
                 DATE_ADD(created_date, INTERVAL 1 DAY) AS unstakeDate, 
                 getRemeiningSeconds(id) AS remaining_second 
                 FROM staking WHERE user_id = ? ORDER BY id DESC`;
    const [result] = await promisePool.query(sql, [data.user_id, data.user_id]);
    return result;
  }

  async usersStakingIncome() {
    const sql = `INSERT INTO staking_earning (staking_id, user_id, staking_period_id, reward_token, is_claim, status) 
                 SELECT id, user_id, staking_period_id, reward_token * remaining_quantity, is_claim, status 
                 FROM staking WHERE status = 1 AND is_claim = 1`;
    const [result] = await promisePool.query(sql);
    return result;
  }

  async rewardClaimCheck(data) {
    const sql = `SELECT se.datetime, s.created_date, 
                 CASE WHEN DATE_ADD(COALESCE(se.datetime, s.created_date), INTERVAL 24 HOUR) < NOW() 
                 THEN 1 ELSE 0 END AS isClaimAvailable 
                 FROM staking AS s 
                 LEFT JOIN staking_earning AS se ON se.staking_id = s.id 
                 WHERE s.user_id = ? AND s.id = ? AND s.staking_period_id = ? 
                 ORDER BY s.id DESC, se.id DESC LIMIT 1`;
    const [result] = await promisePool.query(sql, [
      data.user_id,
      data.staking_id,
      data.staking_period_id,
    ]);
    return result;
  }

  async singalRewardClaim(data) {
    const sql = `INSERT INTO staking_earning (staking_id, user_id, staking_period_id, reward_token, is_claim, status) 
                 VALUES (?, ?, ?, ?, 1, 1)`;
    await promisePool.query(sql, [
      data.staking_id,
      data.user_id,
      data.staking_period_id,
      data.token,
    ]);

    const sql1 = 'UPDATE users SET token_balance = COALESCE(token_balance, 0) + ? WHERE id = ?';
    await promisePool.query(sql1, [parseFloat(data.token), data.user_id]);

    return { success: true };
  }

  async addBalance(data) {
    const sql = 'UPDATE users SET MBUSD_balance = MBUSD_balance + ? WHERE id = ?';
    const [result] = await promisePool.query(sql, [data.token, data.user_id]);
    return result;
  }

  async checkSellPlan(data) {
    const sql = `SELECT id, reward_token, remaining_quantity FROM staking 
                 WHERE user_id = ? AND id = ? AND staking_period_id = ? 
                 AND status = 1 AND DATE(created_date) < CURRENT_DATE`;
    const [result] = await promisePool.query(sql, [
      data.user_id,
      data.staking_id,
      data.staking_period_id,
    ]);
    return result;
  }

  async sellPlan(data) {
    const newToken = data.reward_token * 14;
    const sql = 'UPDATE staking SET is_claim = 0, status = 0, plan_sell_date = NOW() WHERE user_id = ? AND id = ?';
    await promisePool.query(sql, [data.user_id, data.staking_id]);

    const sql1 = 'UPDATE users SET token_balance = COALESCE(token_balance, 0) + ? WHERE id = ?';
    await promisePool.query(sql1, [parseFloat(newToken), data.user_id]);

    return { success: true };
  }

  async getTotalBalance(data) {
    const sql = `SELECT COALESCE(SUM(token_balance), 0) AS total_balance, 
                 COALESCE(SUM(MBUSD_balance), 0) AS MBUSD_total_balance 
                 FROM users WHERE id = ?`;
    const [result] = await promisePool.query(sql, [data.user_id]);
    return result;
  }

  async insertWithdrawRequest(data) {
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

  async withdrawCrypto(data) {
    const sql = `INSERT INTO withdraw_request (user_id, withdrawal_address, token, busd_amount, fee, hash, status) 
                 VALUES (?, ?, ?, ?, ?, ?, 1)`;
    const [result] = await promisePool.query(sql, [
      data.user_id,
      data.withdrawal_address,
      data.token,
      data.busd_amount,
      data.fee,
      data.hash,
    ]);
    return result;
  }

  async balanceUpdate(data) {
    const sql = 'UPDATE users SET token_balance = COALESCE(token_balance, 0) - ? WHERE id = ?';
    const [result] = await promisePool.query(sql, [parseFloat(data.token), data.user_id]);
    return result;
  }

  async getReferralUsersList(data) {
    const sql = `SELECT u.id AS referral_user, u.address, u.datetime, COALESCE(SUM(t.token), 0) AS token 
                 FROM users AS u 
                 LEFT JOIN transaction AS t ON t.referred_by = u.id 
                 WHERE u.referral_id = ? 
                 GROUP BY u.id, u.address`;
    const [result] = await promisePool.query(sql, [data.user_id]);
    return result;
  }

  async getTotalInvested() {
    const sql = `SELECT COALESCE(SUM(CASE WHEN transaction_type_id = 1 AND isblockchainConfirm = 1 
                 THEN busd_amount ELSE 0 END), 0) AS invested, 
                 (SELECT COALESCE(COUNT(address), 0) FROM users) AS investors, 
                 (SELECT COALESCE(SUM(reward_token), 0) FROM staking_earning) AS reward 
                 FROM transaction`;
    const [result] = await promisePool.query(sql);
    return result;
  }

  async userBalanceUpdate(data) {
    const sql1 = `UPDATE transaction SET busd_amount = ?, token = ?, isblockchainConfirm = 1 
                  WHERE id = ? AND transaction_type_id = 1`;
    await promisePool.query(sql1, [data.busd_amount, data.token, data.id]);

    const sql2 = 'UPDATE users SET MBUSD_balance = COALESCE(MBUSD_balance, 0) + ? WHERE id = ?';
    await promisePool.query(sql2, [data.token, data.user_id]);

    return { success: true };
  }

  async userBalanceReject(data) {
    const sql = 'UPDATE transaction SET isblockchainConfirm = 2 WHERE id = ?';
    const [result] = await promisePool.query(sql, [data.id]);
    return result;
  }

  async userBUSDDepositCheck() {
    const sql = 'SELECT * FROM transaction WHERE transaction_type_id = 1 AND isblockchainConfirm = 0';
    const [result] = await promisePool.query(sql);
    return result;
  }
}

module.exports = new UserModel();
