/**
 * DocPlant 🌱 - Validadores
 * 
 * Funciones de validación para datos de entrada.
 */

const config = require('../config/config');

/**
 * Validar formato de email
 * @param {string} email - Email a validar
 * @returns {{ valid: boolean, message: string }}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'El email es requerido' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { valid: false, message: 'El email no puede estar vacío' };
  }

  if (trimmed.length > 254) {
    return { valid: false, message: 'El email es demasiado largo' };
  }

  // Regex para validación de email según RFC 5322 simplificado
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'El formato del email no es válido' };
  }

  return { valid: true, message: 'Email válido' };
}

/**
 * Validar contraseña
 * @param {string} password - Contraseña a validar
 * @returns {{ valid: boolean, message: string }}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'La contraseña es requerida' };
  }

  if (password.length < 6) {
    return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'La contraseña es demasiado larga (máximo 128 caracteres)' };
  }

  return { valid: true, message: 'Contraseña válida' };
}

/**
 * Validar nombre de usuario
 * @param {string} name - Nombre a validar
 * @returns {{ valid: boolean, message: string }}
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'El nombre es requerido' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, message: 'El nombre debe tener al menos 2 caracteres' };
  }

  if (trimmed.length > 100) {
    return { valid: false, message: 'El nombre es demasiado largo (máximo 100 caracteres)' };
  }

  // Solo letras, espacios, acentos y guiones
  const nameRegex = /^[a-zA-ZÀ-ÿñÑ\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, message: 'El nombre solo puede contener letras, espacios y guiones' };
  }

  return { valid: true, message: 'Nombre válido' };
}

/**
 * Validar tipo de archivo según categoría
 * @param {string} mimetype - Tipo MIME del archivo
 * @param {string} category - Categoría: 'template' o 'content'
 * @returns {{ valid: boolean, message: string }}
 */
function validateFileType(mimetype, category) {
  if (!mimetype) {
    return { valid: false, message: 'Tipo de archivo no detectado' };
  }

  const allowedTypes = {
    template: config.files.allowedTemplateTypes,
    content: config.files.allowedContentTypes
  };

  const allowed = allowedTypes[category];
  if (!allowed) {
    return { valid: false, message: `Categoría de archivo no válida: ${category}` };
  }

  if (!allowed.includes(mimetype)) {
    const friendlyTypes = {
      template: 'DOCX, DOC, JPG, PNG o PDF',
      content: 'TXT, JSON, DOCX o DOC'
    };
    return {
      valid: false,
      message: `Tipo de archivo no permitido para ${category}. Tipos aceptados: ${friendlyTypes[category]}`
    };
  }

  return { valid: true, message: 'Tipo de archivo válido' };
}

/**
 * Validar tamaño de archivo según membresía
 * @param {number} size - Tamaño en bytes
 * @param {string} membership - Tipo de membresía ('free', 'premium', 'admin')
 * @returns {{ valid: boolean, message: string }}
 */
function validateFileSize(size, membership = 'free') {
  if (!size || size <= 0) {
    return { valid: false, message: 'El archivo está vacío' };
  }

  const maxSize = (membership === 'premium' || membership === 'admin')
    ? config.files.maxSizePremium
    : config.files.maxSizeFree;

  if (size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    const fileMB = (size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      message: `El archivo (${fileMB} MB) excede el límite de ${maxMB} MB para tu plan ${membership}`
    };
  }

  return { valid: true, message: 'Tamaño de archivo válido' };
}

/**
 * Validar datos de registro completos
 * @param {{ name: string, email: string, password: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateRegistration(data) {
  const errors = [];

  const nameResult = validateName(data.name);
  if (!nameResult.valid) errors.push(nameResult.message);

  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) errors.push(emailResult.message);

  const passwordResult = validatePassword(data.password);
  if (!passwordResult.valid) errors.push(passwordResult.message);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validar datos de login
 * @param {{ email: string, password: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateLogin(data) {
  const errors = [];

  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) errors.push(emailResult.message);

  if (!data.password || data.password.length === 0) {
    errors.push('La contraseña es requerida');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validar actualización de perfil
 * @param {{ name?: string, email?: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateProfileUpdate(data) {
  const errors = [];

  if (data.name !== undefined) {
    const nameResult = validateName(data.name);
    if (!nameResult.valid) errors.push(nameResult.message);
  }

  if (data.email !== undefined) {
    const emailResult = validateEmail(data.email);
    if (!emailResult.valid) errors.push(emailResult.message);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validateFileType,
  validateFileSize,
  validateRegistration,
  validateLogin,
  validateProfileUpdate
};
