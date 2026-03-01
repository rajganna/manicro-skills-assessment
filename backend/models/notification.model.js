const { promisePool } = require('../utils/database');

class NotificationModel {
  async list(data) {
    const sql = `SELECT id, user_id, type, title, body, is_read, created_at 
                 FROM notifications WHERE user_id = ? ORDER BY id DESC`;
    const [rows] = await promisePool.query(sql, [data.user_id]);
    return rows;
  }

  async markRead(data) {
    const sql = 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?';
    const [result] = await promisePool.query(sql, [data.id, data.user_id]);
    return result;
  }
}

module.exports = new NotificationModel();
