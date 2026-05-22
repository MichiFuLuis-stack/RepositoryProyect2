/**
 * DocPlant 🌱 - Modelo de Facturas
 * 
 * Operaciones para gestionar facturas y pagos.
 */

const { db } = require('../config/database');
const { generateInvoiceNumber } = require('../utils/helpers');

const Invoice = {
  /**
   * Crear una nueva factura
   * @param {Object} data - Datos de la factura
   * @returns {Object} Factura creada
   */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO invoices (client_id, invoice_number, paypal_order_id, paypal_payer_email,
                            amount, currency, payment_method, payment_status,
                            membership_type, period_start, period_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invoiceNumber = data.invoice_number || generateInvoiceNumber();

    const result = stmt.run(
      data.client_id,
      invoiceNumber,
      data.paypal_order_id || null,
      data.paypal_payer_email || null,
      data.amount || 0,
      data.currency || 'USD',
      data.payment_method || 'paypal',
      data.payment_status || 'pending',
      data.membership_type || 'premium',
      data.period_start || new Date().toISOString(),
      data.period_end || null
    );

    return Invoice.findById(result.lastInsertRowid);
  },

  /**
   * Buscar factura por ID
   * @param {number} id
   * @returns {Object|undefined}
   */
  findById(id) {
    return db.prepare(`
      SELECT i.*, c.name as client_name, c.email as client_email
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ?
    `).get(id);
  },

  /**
   * Buscar facturas por cliente
   * @param {number} clientId
   * @param {{ page?: number, limit?: number }} options
   * @returns {{ invoices: Array, total: number }}
   */
  findByClientId(clientId, options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE client_id = ?
    `).get(clientId).count;

    const invoices = db.prepare(`
      SELECT * FROM invoices 
      WHERE client_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(clientId, limit, offset);

    return { invoices, total, page, totalPages: Math.ceil(total / limit) };
  },

  /**
   * Buscar factura por ID de orden de PayPal
   * @param {string} paypalOrderId
   * @returns {Object|undefined}
   */
  findByPaypalOrderId(paypalOrderId) {
    return db.prepare(`
      SELECT i.*, c.name as client_name, c.email as client_email
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.paypal_order_id = ?
    `).get(paypalOrderId);
  },

  /**
   * Actualizar estado de pago
   * @param {number} id
   * @param {string} status - Nuevo estado
   * @param {Object} extraData - Datos adicionales
   * @returns {Object}
   */
  updateStatus(id, status, extraData = {}) {
    let sql = 'UPDATE invoices SET payment_status = ?';
    const params = [status];

    if (extraData.paypal_order_id) {
      sql += ', paypal_order_id = ?';
      params.push(extraData.paypal_order_id);
    }

    if (extraData.paypal_payer_email) {
      sql += ', paypal_payer_email = ?';
      params.push(extraData.paypal_payer_email);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    const result = db.prepare(sql).run(...params);
    return { success: result.changes > 0 };
  },

  /**
   * Obtener todas las facturas con paginación (admin)
   * @param {{ page?: number, limit?: number, status?: string }} options
   * @returns {{ invoices: Array, total: number }}
   */
  getAll(options = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (options.status) {
      whereClause += ' AND i.payment_status = ?';
      params.push(options.status);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM invoices i ${whereClause}
    `).get(...params).count;

    const invoices = db.prepare(`
      SELECT i.*, c.name as client_name, c.email as client_email
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { invoices, total, page, totalPages: Math.ceil(total / limit) };
  },

  /**
   * Obtener estadísticas de facturación
   * @returns {Object}
   */
  getStats() {
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM invoices
    `).get().count;

    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'completed'
    `).get().count;

    const pending = db.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'pending'
    `).get().count;

    const totalRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE payment_status = 'completed'
    `).get().total;

    const thisMonth = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM invoices 
      WHERE payment_status = 'completed' 
        AND created_at >= datetime('now', 'start of month')
    `).get().total;

    return { total, completed, pending, totalRevenue, thisMonth };
  },

  /**
   * Obtener ingresos por período
   * @param {string} period - 'day', 'week', 'month', 'year'
   * @returns {Array}
   */
  getRevenue(period = 'month') {
    let groupBy, dateFormat;

    switch (period) {
      case 'day':
        groupBy = "date(created_at)";
        dateFormat = "date(created_at)";
        break;
      case 'week':
        groupBy = "strftime('%Y-%W', created_at)";
        dateFormat = "strftime('%Y-W%W', created_at)";
        break;
      case 'year':
        groupBy = "strftime('%Y', created_at)";
        dateFormat = "strftime('%Y', created_at)";
        break;
      case 'month':
      default:
        groupBy = "strftime('%Y-%m', created_at)";
        dateFormat = "strftime('%Y-%m', created_at)";
        break;
    }

    return db.prepare(`
      SELECT ${dateFormat} as period,
             COUNT(*) as count,
             COALESCE(SUM(amount), 0) as revenue
      FROM invoices
      WHERE payment_status = 'completed'
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT 12
    `).all();
  }
};

module.exports = Invoice;
