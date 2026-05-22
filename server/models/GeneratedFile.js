/**
 * DocPlant 🌱 - Modelo de Archivos Generados
 * 
 * Operaciones para gestionar los documentos generados por el sistema.
 */

const { db } = require('../config/database');

const GeneratedFile = {
  /**
   * Registrar un archivo generado
   * @param {Object} data - Datos del archivo generado
   * @returns {Object} Registro creado
   */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO generated_files (client_id, session_id, template_file_id, content_file_id,
                                    original_name, stored_name, format, file_size, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.client_id || null,
      data.session_id || null,
      data.template_file_id,
      data.content_file_id,
      data.original_name,
      data.stored_name,
      data.format || 'docx',
      data.file_size || 0,
      data.file_path
    );

    return GeneratedFile.findById(result.lastInsertRowid);
  },

  /**
   * Buscar archivo generado por ID
   * @param {number} id
   * @returns {Object|undefined}
   */
  findById(id) {
    return db.prepare(`
      SELECT gf.*, 
             ut.original_name as template_name,
             uc.original_name as content_name
      FROM generated_files gf
      LEFT JOIN uploaded_files ut ON gf.template_file_id = ut.id
      LEFT JOIN uploaded_files uc ON gf.content_file_id = uc.id
      WHERE gf.id = ? AND gf.is_deleted = 0
    `).get(id);
  },

  /**
   * Buscar archivos generados por sesión
   * @param {string} sessionId
   * @returns {Array}
   */
  findBySessionId(sessionId) {
    return db.prepare(`
      SELECT gf.*, 
             ut.original_name as template_name,
             uc.original_name as content_name
      FROM generated_files gf
      LEFT JOIN uploaded_files ut ON gf.template_file_id = ut.id
      LEFT JOIN uploaded_files uc ON gf.content_file_id = uc.id
      WHERE gf.session_id = ? AND gf.is_deleted = 0
      ORDER BY gf.generated_at DESC
    `).all(sessionId);
  },

  /**
   * Buscar archivos generados por cliente
   * @param {number} clientId
   * @param {{ page?: number, limit?: number, format?: string }} options
   * @returns {{ files: Array, total: number }}
   */
  findByClientId(clientId, options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE gf.client_id = ? AND gf.is_deleted = 0';
    const params = [clientId];

    if (options.format) {
      whereClause += ' AND gf.format = ?';
      params.push(options.format);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM generated_files gf ${whereClause}
    `).get(...params).count;

    const files = db.prepare(`
      SELECT gf.*, 
             ut.original_name as template_name,
             uc.original_name as content_name
      FROM generated_files gf
      LEFT JOIN uploaded_files ut ON gf.template_file_id = ut.id
      LEFT JOIN uploaded_files uc ON gf.content_file_id = uc.id
      ${whereClause}
      ORDER BY gf.generated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { files, total, page, totalPages: Math.ceil(total / limit) };
  },

  /**
   * Marcar archivo como descargado
   * @param {number} id
   * @returns {Object}
   */
  markDownloaded(id) {
    const result = db.prepare(`
      UPDATE generated_files SET is_downloaded = 1 WHERE id = ?
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
      UPDATE generated_files SET is_deleted = 1 WHERE id = ?
    `).run(id);
    return { success: result.changes > 0 };
  },

  /**
   * Obtener archivos antiguos para limpieza
   * @param {number} hoursOld
   * @param {boolean} anonymousOnly
   * @returns {Array}
   */
  getOldFiles(hoursOld, anonymousOnly = false) {
    let sql = `
      SELECT * FROM generated_files 
      WHERE is_deleted = 0 
        AND generated_at < datetime('now', '-${hoursOld} hours')
    `;

    if (anonymousOnly) {
      sql += ' AND client_id IS NULL';
    }

    return db.prepare(sql).all();
  },

  /**
   * Eliminar archivos antiguos
   * @param {number} hoursOld
   * @param {boolean} anonymousOnly
   * @returns {Object}
   */
  deleteOld(hoursOld, anonymousOnly = false) {
    let sql = `
      UPDATE generated_files SET is_deleted = 1
      WHERE is_deleted = 0 
        AND generated_at < datetime('now', '-${hoursOld} hours')
    `;

    if (anonymousOnly) {
      sql += ' AND client_id IS NULL';
    }

    const result = db.prepare(sql).run();
    return { success: true, count: result.changes };
  },

  /**
   * Obtener estadísticas de archivos generados
   * @returns {Object}
   */
  getStats() {
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM generated_files WHERE is_deleted = 0
    `).get().count;

    const totalSize = db.prepare(`
      SELECT COALESCE(SUM(file_size), 0) as total FROM generated_files WHERE is_deleted = 0
    `).get().total;

    const byFormat = db.prepare(`
      SELECT format, COUNT(*) as count 
      FROM generated_files WHERE is_deleted = 0
      GROUP BY format
    `).all();

    const downloaded = db.prepare(`
      SELECT COUNT(*) as count FROM generated_files 
      WHERE is_deleted = 0 AND is_downloaded = 1
    `).get().count;

    const today = db.prepare(`
      SELECT COUNT(*) as count FROM generated_files 
      WHERE is_deleted = 0 AND date(generated_at) = date('now')
    `).get().count;

    return { total, totalSize, byFormat, downloaded, today };
  },

  /**
   * Obtener todos los archivos generados (admin)
   * @param {{ page?: number, limit?: number, format?: string }} options
   * @returns {{ files: Array, total: number }}
   */
  getAll(options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (!options.includeDeleted) {
      whereClause += ' AND gf.is_deleted = 0';
    }

    if (options.format) {
      whereClause += ' AND gf.format = ?';
      params.push(options.format);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM generated_files gf ${whereClause}
    `).get(...params).count;

    const files = db.prepare(`
      SELECT gf.*, c.name as client_name, c.email as client_email,
             ut.original_name as template_name,
             uc.original_name as content_name
      FROM generated_files gf
      LEFT JOIN clients c ON gf.client_id = c.id
      LEFT JOIN uploaded_files ut ON gf.template_file_id = ut.id
      LEFT JOIN uploaded_files uc ON gf.content_file_id = uc.id
      ${whereClause}
      ORDER BY gf.generated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { files, total, page, totalPages: Math.ceil(total / limit) };
  }
};

module.exports = GeneratedFile;
