/**
 * DocPlant 🌱 - Modelo de Archivos Subidos
 * 
 * Operaciones para gestionar archivos subidos por usuarios.
 */

const { db } = require('../config/database');

const UploadedFile = {
  /**
   * Registrar un archivo subido
   * @param {Object} data - Datos del archivo
   * @returns {Object} Registro del archivo creado
   */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO uploaded_files (client_id, session_id, original_name, stored_name, 
                                   file_type, mime_type, file_size, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.client_id || null,
      data.session_id || null,
      data.original_name,
      data.stored_name,
      data.file_type,
      data.mime_type,
      data.file_size,
      data.file_path
    );

    return UploadedFile.findById(result.lastInsertRowid);
  },

  /**
   * Buscar archivo por ID
   * @param {number} id
   * @returns {Object|undefined}
   */
  findById(id) {
    return db.prepare(`
      SELECT * FROM uploaded_files WHERE id = ? AND is_deleted = 0
    `).get(id);
  },

  /**
   * Buscar archivos por sesión
   * @param {string} sessionId
   * @returns {Array}
   */
  findBySessionId(sessionId) {
    return db.prepare(`
      SELECT * FROM uploaded_files 
      WHERE session_id = ? AND is_deleted = 0
      ORDER BY uploaded_at DESC
    `).all(sessionId);
  },

  /**
   * Buscar archivos por cliente
   * @param {number} clientId
   * @param {{ page?: number, limit?: number, file_type?: string }} options
   * @returns {{ files: Array, total: number }}
   */
  findByClientId(clientId, options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE client_id = ? AND is_deleted = 0';
    const params = [clientId];

    if (options.file_type) {
      whereClause += ' AND file_type = ?';
      params.push(options.file_type);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM uploaded_files ${whereClause}
    `).get(...params).count;

    const files = db.prepare(`
      SELECT * FROM uploaded_files ${whereClause}
      ORDER BY uploaded_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { files, total, page, totalPages: Math.ceil(total / limit) };
  },

  /**
   * Marcar archivo como procesado
   * @param {number} id
   * @returns {Object}
   */
  markProcessed(id) {
    const result = db.prepare(`
      UPDATE uploaded_files SET is_processed = 1 WHERE id = ?
    `).run(id);
    return { success: result.changes > 0 };
  },

  /**
   * Marcar archivo como eliminado (soft delete)
   * @param {number} id
   * @returns {Object}
   */
  markDeleted(id) {
    const result = db.prepare(`
      UPDATE uploaded_files SET is_deleted = 1 WHERE id = ?
    `).run(id);
    return { success: result.changes > 0 };
  },

  /**
   * Obtener archivos antiguos para limpieza
   * @param {number} hoursOld - Horas de antigüedad
   * @param {boolean} anonymousOnly - Solo archivos anónimos
   * @returns {Array}
   */
  getOldFiles(hoursOld, anonymousOnly = false) {
    let sql = `
      SELECT * FROM uploaded_files 
      WHERE is_deleted = 0 
        AND uploaded_at < datetime('now', '-${hoursOld} hours')
    `;

    if (anonymousOnly) {
      sql += ' AND client_id IS NULL';
    }

    return db.prepare(sql).all();
  },

  /**
   * Eliminar archivos antiguos de la BD (después de borrarlos del disco)
   * @param {number} hoursOld
   * @param {boolean} anonymousOnly
   * @returns {Object}
   */
  deleteOld(hoursOld, anonymousOnly = false) {
    let sql = `
      UPDATE uploaded_files SET is_deleted = 1
      WHERE is_deleted = 0 
        AND uploaded_at < datetime('now', '-${hoursOld} hours')
    `;

    if (anonymousOnly) {
      sql += ' AND client_id IS NULL';
    }

    const result = db.prepare(sql).run();
    return { success: true, count: result.changes };
  },

  /**
   * Obtener estadísticas de archivos subidos
   * @returns {Object}
   */
  getStats() {
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM uploaded_files WHERE is_deleted = 0
    `).get().count;

    const totalSize = db.prepare(`
      SELECT COALESCE(SUM(file_size), 0) as total FROM uploaded_files WHERE is_deleted = 0
    `).get().total;

    const byType = db.prepare(`
      SELECT file_type, COUNT(*) as count 
      FROM uploaded_files WHERE is_deleted = 0
      GROUP BY file_type
    `).all();

    const today = db.prepare(`
      SELECT COUNT(*) as count FROM uploaded_files 
      WHERE is_deleted = 0 AND date(uploaded_at) = date('now')
    `).get().count;

    return { total, totalSize, byType, today };
  },

  /**
   * Obtener todos los archivos con filtros (para admin)
   * @param {{ page?: number, limit?: number, file_type?: string, includeDeleted?: boolean }} options
   * @returns {{ files: Array, total: number }}
   */
  getAll(options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (!options.includeDeleted) {
      whereClause += ' AND uf.is_deleted = 0';
    }

    if (options.file_type) {
      whereClause += ' AND uf.file_type = ?';
      params.push(options.file_type);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM uploaded_files uf ${whereClause}
    `).get(...params).count;

    const files = db.prepare(`
      SELECT uf.*, c.name as client_name, c.email as client_email
      FROM uploaded_files uf
      LEFT JOIN clients c ON uf.client_id = c.id
      ${whereClause}
      ORDER BY uf.uploaded_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { files, total, page, totalPages: Math.ceil(total / limit) };
  }
};

module.exports = UploadedFile;
