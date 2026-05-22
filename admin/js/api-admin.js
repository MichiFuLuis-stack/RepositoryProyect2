/* ============================================================
   DocPlant 🌱 — Cliente API del Admin
   Módulo centralizado para todas las llamadas a la API admin
   ============================================================ */

const AdminAPI = (() => {
  'use strict';

  // URL base para las rutas del admin
  const BASE_URL = '/api/admin';

  /**
   * Realiza una petición HTTP al servidor con autenticación de admin
   * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
   * @param {string} url - Ruta relativa de la API
   * @param {Object|null} data - Datos a enviar en el cuerpo
   * @returns {Promise<Object>} - Respuesta parseada como JSON
   */
  async function request(method, url, data = null) {
    const fullUrl = `${BASE_URL}${url}`;

    // Configurar las opciones del fetch
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include' // Enviar cookies de sesión
    };

    // Agregar token de autenticación si existe
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Agregar cuerpo si hay datos
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(fullUrl, options);

      // Verificar si la sesión expiró o no hay permisos
      if (response.status === 401 || response.status === 403) {
        console.warn('Sesión de admin expirada o sin permisos');
        // Redirigir al login si no es admin
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html?reason=unauthorized';
        return null;
      }

      // Intentar parsear como JSON
      const contentType = response.headers.get('content-type');
      let result;

      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      // Si la respuesta no es exitosa, lanzar error
      if (!response.ok) {
        const errorMsg = result?.message || result?.error || `Error ${response.status}`;
        throw new Error(errorMsg);
      }

      return result;
    } catch (error) {
      // Si es un error de red
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('Error de conexión con el servidor:', error);
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
      }
      throw error;
    }
  }

  /**
   * Descarga un archivo del servidor
   * @param {string} url - Ruta relativa de la API
   * @param {string} filename - Nombre del archivo a descargar
   */
  async function downloadFile(url, filename) {
    const fullUrl = `${BASE_URL}${url}`;
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      throw error;
    }
  }

  // ============================================================
  // Módulo: Dashboard
  // ============================================================
  const dashboard = {
    /**
     * Obtener estadísticas generales del dashboard
     * @returns {Promise<Object>} Estadísticas del sistema
     */
    async getStats() {
      return await request('GET', '/dashboard/stats');
    },

    /**
     * Obtener datos de actividad para gráficos
     * @param {string} period - Período: 'week', 'month', 'year'
     * @returns {Promise<Object>} Datos de actividad
     */
    async getActivity(period = 'week') {
      return await request('GET', `/dashboard/activity?period=${period}`);
    },

    /**
     * Obtener actividad reciente
     * @param {number} limit - Número de items
     * @returns {Promise<Array>} Lista de actividades recientes
     */
    async getRecentActivity(limit = 10) {
      return await request('GET', `/dashboard/recent?limit=${limit}`);
    }
  };

  // ============================================================
  // Módulo: Clientes
  // ============================================================
  const clients = {
    /**
     * Obtener lista de clientes con paginación y filtros
     * @param {number} page - Número de página
     * @param {string} search - Término de búsqueda
     * @param {Object} filters - Filtros adicionales
     * @returns {Promise<Object>} Lista de clientes paginada
     */
    async getAll(page = 1, search = '', filters = {}) {
      let url = `/clients?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filters.membership) url += `&membership=${filters.membership}`;
      if (filters.status) url += `&status=${filters.status}`;
      return await request('GET', url);
    },

    /**
     * Obtener un cliente por su ID
     * @param {number} id - ID del cliente
     * @returns {Promise<Object>} Datos del cliente
     */
    async getById(id) {
      return await request('GET', `/clients/${id}`);
    },

    /**
     * Actualizar datos de un cliente
     * @param {number} id - ID del cliente
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} Cliente actualizado
     */
    async update(id, data) {
      return await request('PUT', `/clients/${id}`, data);
    },

    /**
     * Eliminar un cliente
     * @param {number} id - ID del cliente
     * @returns {Promise<Object>} Confirmación
     */
    async delete(id) {
      return await request('DELETE', `/clients/${id}`);
    },

    /**
     * Cambiar la membresía de un cliente
     * @param {number} id - ID del cliente
     * @param {string} membership - Tipo de membresía
     * @returns {Promise<Object>} Resultado
     */
    async changeMembership(id, membership) {
      return await request('PUT', `/clients/${id}/membership`, { membership });
    },

    /**
     * Exportar lista de clientes
     * @param {string} format - Formato: 'csv' o 'json'
     * @returns {Promise<void>}
     */
    async export(format = 'csv') {
      await downloadFile(`/clients/export?format=${format}`, `clientes.${format}`);
    }
  };

  // ============================================================
  // Módulo: Archivos
  // ============================================================
  const files = {
    /**
     * Obtener lista de archivos con paginación y filtros
     * @param {number} page - Número de página
     * @param {Object} filters - Filtros (type, dateFrom, dateTo)
     * @returns {Promise<Object>} Lista de archivos
     */
    async getAll(page = 1, filters = {}) {
      let url = `/files?page=${page}&limit=15`;
      if (filters.type) url += `&type=${filters.type}`;
      if (filters.dateFrom) url += `&dateFrom=${filters.dateFrom}`;
      if (filters.dateTo) url += `&dateTo=${filters.dateTo}`;
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
      return await request('GET', url);
    },

    /**
     * Eliminar un archivo
     * @param {number} id - ID del archivo
     * @returns {Promise<Object>} Confirmación
     */
    async delete(id) {
      return await request('DELETE', `/files/${id}`);
    },

    /**
     * Eliminar múltiples archivos
     * @param {Array<number>} ids - IDs de archivos a eliminar
     * @returns {Promise<Object>} Resultado
     */
    async deleteBulk(ids) {
      return await request('POST', '/files/bulk-delete', { ids });
    },

    /**
     * Limpiar archivos según opciones
     * @param {Object} options - Opciones de limpieza
     * @returns {Promise<Object>} Resultado de la limpieza
     */
    async cleanup(options) {
      return await request('POST', '/files/cleanup', options);
    },

    /**
     * Obtener estadísticas de almacenamiento
     * @returns {Promise<Object>} Datos de almacenamiento
     */
    async getStorageStats() {
      return await request('GET', '/files/storage');
    },

    /**
     * Descargar un archivo
     * @param {number} id - ID del archivo
     * @param {string} filename - Nombre del archivo
     */
    async download(id, filename) {
      await downloadFile(`/files/${id}/download`, filename);
    }
  };

  // ============================================================
  // Módulo: Servidor
  // ============================================================
  const server = {
    /**
     * Obtener estadísticas del servidor
     * @returns {Promise<Object>} Estadísticas (CPU, RAM, Disco, Uptime)
     */
    async getStats() {
      return await request('GET', '/server');
    },

    /**
     * Obtener logs del servidor
     * @param {number} lines - Número de líneas
     * @returns {Promise<Object>} Logs del servidor
     */
    async getLogs(lines = 50) {
      return await request('GET', `/server/logs?lines=${lines}`);
    },

    /**
     * Liberar recursos del servidor
     * @param {Object} options - Opciones de liberación
     * @returns {Promise<Object>} Resultado
     */
    async freeResources(options) {
      return await request('POST', '/server/free-resources', options);
    },

    /**
     * Obtener información del sistema
     * @returns {Promise<Object>} Info del sistema
     */
    async getSystemInfo() {
      return await request('GET', '/server/info');
    }
  };

  // ============================================================
  // Módulo: Base de Datos
  // ============================================================
  const database = {
    /**
     * Obtener lista de tablas disponibles
     * @returns {Promise<Array>} Lista de tablas
     */
    async getTables() {
      return await request('GET', '/database/tables');
    },

    /**
     * Obtener datos de una tabla con paginación y búsqueda
     * @param {string} tableName - Nombre de la tabla
     * @param {number} page - Número de página
     * @param {string} search - Término de búsqueda
     * @returns {Promise<Object>} Datos de la tabla
     */
    async getTableData(tableName, page = 1, search = '') {
      let url = `/database/${encodeURIComponent(tableName)}?page=${page}&limit=25`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      return await request('GET', url);
    },

    /**
     * Ejecutar una consulta SQL (solo SELECT)
     * @param {string} sql - Consulta SQL
     * @returns {Promise<Object>} Resultados de la consulta
     */
    async executeQuery(sql) {
      return await request('POST', '/database/query', { sql });
    },

    /**
     * Exportar una tabla en formato CSV o JSON
     * @param {string} tableName - Nombre de la tabla
     * @param {string} format - Formato: 'csv' o 'json'
     */
    async exportTable(tableName, format = 'csv') {
      await downloadFile(
        `/database/tables/${encodeURIComponent(tableName)}/export?format=${format}`,
        `${tableName}.${format}`
      );
    },

    /**
     * Obtener estadísticas de la base de datos
     * @returns {Promise<Object>} Estadísticas
     */
    async getStats() {
      return await request('GET', '/database/stats');
    },

    /**
     * Info de una tabla (columnas, conteos)
     * @param {string} tableName - Nombre de la tabla
     * @returns {Promise<Object>} Info de la tabla
     */
    async getTableInfo(tableName) {
      return await request('GET', `/database/tables/${encodeURIComponent(tableName)}/info`);
    },

    /**
     * Eliminar un registro de una tabla
     * @param {string} tableName - Nombre de la tabla
     * @param {number} id - ID del registro
     */
    async deleteRecord(tableName, id) {
      return await request('DELETE', `/database/${encodeURIComponent(tableName)}/${id}`);
    }
  };

  // ============================================================
  // Módulo: Facturación
  // ============================================================
  const invoices = {
    /**
     * Obtener lista de facturas con paginación y filtros
     * @param {number} page - Número de página
     * @param {Object} filters - Filtros (status, dateFrom, dateTo)
     * @returns {Promise<Object>} Lista de facturas
     */
    async getAll(page = 1, filters = {}) {
      let url = `/invoices?page=${page}&limit=15`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.dateFrom) url += `&dateFrom=${filters.dateFrom}`;
      if (filters.dateTo) url += `&dateTo=${filters.dateTo}`;
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
      return await request('GET', url);
    },

    /**
     * Obtener detalle de una factura
     * @param {number} id - ID de la factura
     * @returns {Promise<Object>} Detalle de la factura
     */
    async getById(id) {
      return await request('GET', `/invoices/${id}`);
    },

    /**
     * Obtener estadísticas de ingresos
     * @returns {Promise<Object>} Estadísticas de ingresos
     */
    async getRevenueStats() {
      return await request('GET', '/invoices/revenue');
    }
  };

  // ============================================================
  // Módulo: Membresías
  // ============================================================
  const memberships = {
    /**
     * Actualizar la membresía de un cliente
     * @param {number} clientId - ID del cliente
     * @param {string} type - Tipo de membresía
     * @returns {Promise<Object>} Resultado
     */
    async update(clientId, type) {
      return await request('PUT', `/memberships/${clientId}`, { type });
    }
  };

  // API pública del módulo
  return {
    request,
    downloadFile,
    dashboard,
    clients,
    files,
    server,
    database,
    invoices,
    memberships
  };
})();
