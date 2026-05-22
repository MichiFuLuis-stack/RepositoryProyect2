/**
 * DocPlant 🌱 - Modelo de Cliente
 * 
 * Operaciones CRUD para la tabla clients.
 */

const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

const Client = {
  /**
   * Crear un nuevo cliente
   * @param {{ name: string, email: string, password: string, membership?: string }} data
   * @returns {Object} Cliente creado
   */
  create(data) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(data.password, salt);

    const stmt = db.prepare(`
      INSERT INTO clients (name, email, password_hash, membership)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name.trim(),
      data.email.trim().toLowerCase(),
      passwordHash,
      data.membership || 'free'
    );

    return Client.findById(result.lastInsertRowid);
  },

  /**
   * Buscar cliente por ID
   * @param {number} id
   * @returns {Object|undefined}
   */
  findById(id) {
    return db.prepare(`
      SELECT id, name, email, membership, daily_uploads_used,
             last_upload_reset, created_at, updated_at, is_active
      FROM clients WHERE id = ?
    `).get(id);
  },

  /**
   * Buscar cliente por email (incluye password_hash para autenticación)
   * @param {string} email
   * @returns {Object|undefined}
   */
  findByEmail(email) {
    return db.prepare(`
      SELECT id, name, email, password_hash, membership,
             daily_uploads_used, last_upload_reset,
             created_at, updated_at, is_active
      FROM clients WHERE email = ? AND is_active = 1
    `).get(email.trim().toLowerCase());
  },

  /**
   * Actualizar membresía del cliente
   * @param {number} id - ID del cliente
   * @param {string} membership - Nueva membresía ('free', 'premium', 'admin')
   * @returns {Object} Resultado de la operación
   */
  updateMembership(id, membership) {
    const result = db.prepare(`
      UPDATE clients SET membership = ? WHERE id = ?
    `).run(membership, id);

    return { success: result.changes > 0 };
  },

  /**
   * Incrementar el contador de subidas diarias
   * @param {number} id
   * @returns {Object}
   */
  updateUploadsCount(id) {
    const client = Client.findById(id);
    if (!client) return { success: false };

    // Verificar si necesita reinicio (nuevo día)
    const lastReset = new Date(client.last_upload_reset);
    const now = new Date();
    const isNewDay = lastReset.toDateString() !== now.toDateString();

    if (isNewDay) {
      db.prepare(`
        UPDATE clients 
        SET daily_uploads_used = 1, 
            last_upload_reset = datetime('now')
        WHERE id = ?
      `).run(id);
    } else {
      db.prepare(`
        UPDATE clients 
        SET daily_uploads_used = daily_uploads_used + 1
        WHERE id = ?
      `).run(id);
    }

    return { success: true };
  },

  /**
   * Reiniciar contadores de subidas diarias para todos los clientes
   * @returns {Object}
   */
  resetDailyUploads() {
    const result = db.prepare(`
      UPDATE clients 
      SET daily_uploads_used = 0, 
          last_upload_reset = datetime('now')
      WHERE daily_uploads_used > 0
    `).run();

    return { success: true, count: result.changes };
  },

  /**
   * Eliminar un cliente (soft delete - desactivar)
   * @param {number} id
   * @returns {Object}
   */
  delete(id) {
    const result = db.prepare(`
      UPDATE clients SET is_active = 0 WHERE id = ?
    `).run(id);

    return { success: result.changes > 0 };
  },

  /**
   * Eliminar un cliente permanentemente
   * @param {number} id
   * @returns {Object}
   */
  hardDelete(id) {
    const result = db.prepare(`
      DELETE FROM clients WHERE id = ?
    `).run(id);

    return { success: result.changes > 0 };
  },

  /**
   * Obtener todos los clientes con paginación
   * @param {{ page?: number, limit?: number, membership?: string }} options
   * @returns {{ clients: Array, total: number, page: number, totalPages: number }}
   */
  getAll(options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (options.membership) {
      whereClause += ' AND membership = ?';
      params.push(options.membership);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM clients ${whereClause}
    `).get(...params).count;

    const clients = db.prepare(`
      SELECT id, name, email, membership, daily_uploads_used,
             created_at, updated_at, is_active
      FROM clients ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      clients,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Contar total de clientes
   * @param {{ active?: boolean }} options
   * @returns {number}
   */
  count(options = {}) {
    let sql = 'SELECT COUNT(*) as count FROM clients';
    const params = [];

    if (options.active !== undefined) {
      sql += ' WHERE is_active = ?';
      params.push(options.active ? 1 : 0);
    }

    return db.prepare(sql).get(...params).count;
  },

  /**
   * Buscar clientes por nombre o email
   * @param {string} query - Término de búsqueda
   * @param {{ page?: number, limit?: number }} options
   * @returns {{ clients: Array, total: number }}
   */
  search(query, options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;
    const searchTerm = `%${query}%`;

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM clients
      WHERE (name LIKE ? OR email LIKE ?) AND is_active = 1
    `).get(searchTerm, searchTerm).count;

    const clients = db.prepare(`
      SELECT id, name, email, membership, daily_uploads_used,
             created_at, updated_at, is_active
      FROM clients
      WHERE (name LIKE ? OR email LIKE ?) AND is_active = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, limit, offset);

    return {
      clients,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Actualizar perfil del cliente
   * @param {number} id
   * @param {{ name?: string, email?: string }} data
   * @returns {Object}
   */
  updateProfile(id, data) {
    const updates = [];
    const params = [];

    if (data.name) {
      updates.push('name = ?');
      params.push(data.name.trim());
    }

    if (data.email) {
      updates.push('email = ?');
      params.push(data.email.trim().toLowerCase());
    }

    if (updates.length === 0) {
      return { success: false, message: 'No hay datos para actualizar' };
    }

    params.push(id);
    const result = db.prepare(`
      UPDATE clients SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    return { success: result.changes > 0 };
  },

  /**
   * Cambiar contraseña
   * @param {number} id
   * @param {string} newPassword
   * @returns {Object}
   */
  updatePassword(id, newPassword) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    const result = db.prepare(`
      UPDATE clients SET password_hash = ? WHERE id = ?
    `).run(hash, id);

    return { success: result.changes > 0 };
  },

  /**
   * Verificar contraseña
   * @param {string} password - Contraseña en texto plano
   * @param {string} hash - Hash almacenado
   * @returns {boolean}
   */
  verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }
};

module.exports = Client;
