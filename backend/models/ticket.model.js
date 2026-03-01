const { promisePool } = require('../utils/database');

class TicketModel {
  async create(data) {
    const sql = 'INSERT INTO ticket (user_id, subject, status) VALUES (?, ?, ?)';
    const [result] = await promisePool.query(sql, [data.user_id, data.subject, 'open']);
    return result;
  }

  async list(data) {
    const sql = `SELECT id, user_id, subject, status, created_at, updated_at 
                 FROM ticket WHERE user_id = ? ORDER BY id DESC`;
    const [rows] = await promisePool.query(sql, [data.user_id]);
    return rows;
  }
}

module.exports = new TicketModel();
