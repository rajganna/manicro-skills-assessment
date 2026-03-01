const { promisePool } = require('../utils/database');

class TicketMessageModel {
  async create(data) {
    const sql = `INSERT INTO ticket_message (ticket_id, sender, receiver, message) 
                 VALUES (?, ?, ?, ?)`;
    const [result] = await promisePool.query(sql, [
      data.ticket_id,
      data.sender_id,
      data.receiver_id || null,
      data.message,
    ]);
    return result;
  }

  async list(data) {
    const sql = `SELECT id, ticket_id, sender, receiver, message, datetime 
                 FROM ticket_message WHERE ticket_id = ? ORDER BY id ASC`;
    const [rows] = await promisePool.query(sql, [data.ticket_id]);
    return rows;
  }
}

module.exports = new TicketMessageModel();
