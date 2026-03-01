const { promisePool } = require('../utils/database');

class SessionModel {
  async save(data) {
    const sql = 'INSERT INTO auth_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)';
    const [result] = await promisePool.query(sql, [data.user_id, data.refresh_token, data.expires_at]);
    return result;
  }

  async revoke(data) {
    const sql = 'DELETE FROM auth_sessions WHERE refresh_token = ?';
    const [result] = await promisePool.query(sql, [data.refresh_token]);
    return result;
  }

  async find(data) {
    const sql = 'SELECT * FROM auth_sessions WHERE refresh_token = ? LIMIT 1';
    const [rows] = await promisePool.query(sql, [data.refresh_token]);
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = new SessionModel();
