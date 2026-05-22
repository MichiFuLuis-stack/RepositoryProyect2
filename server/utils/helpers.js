/**
 * DocPlant 🌱 - Utilidades Generales
 * 
 * Funciones auxiliares reutilizables en todo el proyecto.
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Generar un nombre de archivo único preservando la extensión original
 * @param {string} originalName - Nombre original del archivo
 * @returns {string} Nombre único generado
 */
function generateUniqueFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const uniqueId = uuidv4();
  return `${uniqueId}${ext}`;
}

/**
 * Formatear tamaño de archivo en bytes a formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado (ej: "2.5 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(2);
  
  return `${parseFloat(size)} ${sizes[i]}`;
}

/**
 * Formatear una fecha a formato legible en español
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Generar un número de factura único
 * @returns {string} Número de factura (ej: "DP-2024-000042")
 */
function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `DP-${year}-${random}`;
}

/**
 * Sanitizar nombre de archivo eliminando caracteres peligrosos
 * @param {string} name - Nombre a sanitizar
 * @returns {string} Nombre sanitizado
 */
function sanitizeFilename(name) {
  if (!name) return 'archivo_sin_nombre';
  
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')  // Caracteres no permitidos en Windows/Unix
    .replace(/\.{2,}/g, '.')                     // Múltiples puntos consecutivos
    .replace(/^\.+/, '')                          // Puntos al inicio
    .replace(/\s+/g, '_')                         // Espacios por guiones bajos
    .trim()
    .substring(0, 255);                           // Límite de longitud
}

/**
 * Obtener la extensión de un archivo en minúsculas
 * @param {string} filename - Nombre del archivo
 * @returns {string} Extensión con punto (ej: ".docx")
 */
function getFileExtension(filename) {
  if (!filename) return '';
  return path.extname(filename).toLowerCase();
}

/**
 * Verificar si un tipo MIME es permitido según la categoría
 * @param {string} mimetype - Tipo MIME del archivo
 * @param {string} type - Categoría: 'template' o 'content'
 * @returns {boolean} Si el tipo es permitido
 */
function isAllowedFileType(mimetype, type) {
  const templateTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];

  const contentTypes = [
    'text/plain',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  if (type === 'template') {
    return templateTypes.includes(mimetype);
  } else if (type === 'content') {
    return contentTypes.includes(mimetype);
  }

  return false;
}

/**
 * Generar un token de sesión aleatorio
 * @returns {string} Token de sesión
 */
function generateSessionToken() {
  return `sess_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Calcular la fecha de expiración
 * @param {number} hours - Horas desde ahora
 * @returns {string} Fecha ISO de expiración
 */
function getExpirationDate(hours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString().replace('T', ' ').split('.')[0];
}

/**
 * Crear una respuesta estándar de éxito
 * @param {*} data - Datos a enviar
 * @param {string} message - Mensaje descriptivo
 * @returns {Object} Objeto de respuesta
 */
function successResponse(data = null, message = 'Operación exitosa') {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return response;
}

/**
 * Crear una respuesta estándar de error
 * @param {string} message - Mensaje de error
 * @param {number} code - Código de error interno
 * @returns {Object} Objeto de respuesta de error
 */
function errorResponse(message = 'Error interno del servidor', code = 500) {
  return {
    success: false,
    error: { message, code }
  };
}

/**
 * Extraer la IP del cliente de la petición
 * @param {Object} req - Objeto request de Express
 * @returns {string} Dirección IP
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         '0.0.0.0';
}

/**
 * Verificar si una cadena es un JSON válido
 * @param {string} str - Cadena a verificar
 * @returns {boolean}
 */
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  generateUniqueFilename,
  formatFileSize,
  formatDate,
  generateInvoiceNumber,
  sanitizeFilename,
  getFileExtension,
  isAllowedFileType,
  generateSessionToken,
  getExpirationDate,
  successResponse,
  errorResponse,
  getClientIP,
  isValidJSON
};
