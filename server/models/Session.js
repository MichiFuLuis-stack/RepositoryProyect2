/**
 * DocPlant 🌱 - Modelo de Sesiones
 * 
 * Gestión de sesiones tanto autenticadas como anónimas.
 */

const { db } = require('../config/database');
const { generateSessionToken, getExpirationDate } = require('../utils/helpers');
const config = require('../config/config');

const Session = {
  /**
   * Crear una nueva sesión
   * @param {Object} data
   * @returns {Object} Sesión creada
   */
  create(data) {
    const token = data.session_token || generateSessionToken();
    const expiresAt = data.expires_at || getExpirationDate(config.session.expiryHours);

    const stmt = db.prepare(`
      INSERT INTO sessions (session_token, client_id, ip_address, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      token,
      data.client_id || null,
      data.ip_address || '0.0.0.0',
      expiresAt
    );

    return Session.findByToken(token);
  },

  /**
   * Buscar sesión por token
   * @param {string} token
   * @returns {Object|undefined}
   */
  findByToken(token) {
    return db.prepare(`
      SELECT s.*, c.name as client_name, c.email as client_email, c.membership
      FROM sessions s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.session_token = ? AND s.is_active = 1
        AND s.expires_at > datetime('now')
    `).get(token);
  },

  /**
   * Buscar sesiones activas por cliente
   * @param {number} clientId
   * @returns {Array}
   */
  findByClientId(clientId) {
    return db.prepare(`
      SELECT * FROM sessions 
      WHERE client_id = ? AND is_active = 1 AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `).all(clientId);
  },

  /**
   * Incrementar contador de subidas de la sesión
   * @param {string} token
   * @returns {Object}
   */
  updateUploadsCount(token) {
    const result = db.prepare(`
      UPDATE sessions SET uploads_count = uploads_count + 1
      WHERE session_token = ?
    `).run(token);

    return { success: result.changes > 0 };
  },

  /**
   * Desactivar una sesión
   * @param {string} token
   * @returns {Object}
   */
  deactivate(token) {
    const result = db.prepare(`
      UPDATE sessions SET is_active = 0 WHERE session_token = ?
    `).run(token);

    return { success: result.changes > 0 };
  },

  /**
   * Desactivar todas las sesiones de un cliente
   * @param {number} clientId
   * @returns {Object}
   */
  deactivateByClient(clientId) {
    const result = db.prepare(`
      UPDATE sessions SET is_active = 0 WHERE client_id = ?
    `).run(clientId);

    return { success: true, count: result.changes };
  },

  /**
   * Limpiar sesiones expiradas
   * @returns {Object}
   */
  cleanExpired() {
    const result = db.prepare(`
      UPDATE sessions SET is_active = 0
      WHERE is_active = 1 AND expires_at <= datetime('now')
    `).run();

    return { success: true, count: result.changes };
  },

  /**
   * Obtener número de sesiones activas
   * @returns {number}
   */
  getActiveCount() {
    return db.prepare(`
      SELECT COUNT(*) as count FROM sessions 
      WHERE is_active = 1 AND expires_at > datetime('now')
    `).get().count;
  },

  /**
   * Obtener todas las sesiones activas (admin)
   * @param {{ page?: number, limit?: number }} options
   * @returns {{ sessions: Array, total: number }}
   */
  getAll(options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM sessions WHERE is_active = 1
    `).get().count;

    const sessions = db.prepare(`
      SELECT s.*, c.name as client_name, c.email as client_email
      FROM sessions s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.is_active = 1
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return { sessions, total, page, totalPages: Math.ceil(total / limit) };
  }
};

module.exports = Session;
