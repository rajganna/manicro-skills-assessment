const { promisePool } = require('../utils/database');

class StakingPlanModel {
  async list() {
    const sql = 'SELECT * FROM staking_period ORDER BY id ASC';
    const [rows] = await promisePool.query(sql);
    return rows;
  }

  async find(id) {
    const sql = 'SELECT * FROM staking_period WHERE id = ? LIMIT 1';
    const [rows] = await promisePool.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = new StakingPlanModel();
