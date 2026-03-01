const { promisePool } = require('../utils/database');

class StakingEarningModel {
  async listByUser(data) {
    const sql = 'SELECT * FROM staking_earning WHERE user_id = ? ORDER BY id DESC';
    const [rows] = await promisePool.query(sql, [data.user_id]);
    return rows;
  }
}

module.exports = new StakingEarningModel();
