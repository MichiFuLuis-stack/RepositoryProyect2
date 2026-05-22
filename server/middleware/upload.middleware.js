/**
 * DocPlant 🌱 - Middleware de Subida de Archivos
 * 
 * Configura Multer para manejar la subida de archivos
 * con validación de tipo, tamaño y nombrado único.
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const { errorResponse } = require('../utils/helpers');

// Asegurar que existe el directorio de uploads
const fs = require('fs');
if (!fs.existsSync(config.uploadsPath)) {
  fs.mkdirSync(config.uploadsPath, { recursive: true });
}

/**
 * Configuración de almacenamiento en disco
 * Genera nombres únicos preservando la extensión original
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.uploadsPath);
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${uniqueId}${ext}`;
    cb(null, storedName);
  }
});

/**
 * Filtro de archivos para plantillas
 * Acepta: .docx, .doc, .jpg, .jpeg, .png, .pdf
 */
function templateFileFilter(req, file, cb) {
  const allowedMimes = config.files.allowedTemplateTypes;
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.docx', '.doc', '.jpg', '.jpeg', '.png', '.pdf'];

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido para plantilla. Tipos aceptados: DOCX, DOC, JPG, PNG, PDF`), false);
  }
}

/**
 * Filtro de archivos para contenido
 * Acepta: .txt, .json, .docx, .doc
 */
function contentFileFilter(req, file, cb) {
  const allowedMimes = config.files.allowedContentTypes;
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.txt', '.json', '.docx', '.doc'];

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido para contenido. Tipos aceptados: TXT, JSON, DOCX, DOC`), false);
  }
}

/**
 * Filtro general de archivos
 * Acepta todos los tipos permitidos
 */
function generalFileFilter(req, file, cb) {
  const allAllowedMimes = [
    ...config.files.allowedTemplateTypes,
    ...config.files.allowedContentTypes
  ];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allAllowedMimes.includes(file.mimetype) || config.files.allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Extensiones aceptadas: ${config.files.allowedExtensions.join(', ')}`), false);
  }
}

/**
 * Obtener el límite de tamaño según la membresía del usuario
 * @param {Object} req - Request de Express
 * @returns {number} Tamaño máximo en bytes
 */
function getMaxFileSize(req) {
  if (req.user && (req.user.membership === 'premium' || req.user.membership === 'admin')) {
    return config.files.maxSizePremium;
  }
  return config.files.maxSizeFree;
}

/**
 * Upload para archivos de plantilla
 */
const uploadTemplate = multer({
  storage: storage,
  fileFilter: templateFileFilter,
  limits: {
    fileSize: config.files.maxSizePremium, // Usar el máximo, validar después
    files: 1
  }
});

/**
 * Upload para archivos de contenido
 */
const uploadContent = multer({
  storage: storage,
  fileFilter: contentFileFilter,
  limits: {
    fileSize: config.files.maxSizePremium,
    files: 1
  }
});

/**
 * Upload general (cualquier tipo permitido)
 */
const uploadGeneral = multer({
  storage: storage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: config.files.maxSizePremium,
    files: 5
  }
});

/**
 * Middleware para manejar errores de Multer
 */
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json(
          errorResponse('El archivo excede el tamaño máximo permitido.', 413)
        );
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json(
          errorResponse('Se excedió el número máximo de archivos permitidos.', 400)
        );
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json(
          errorResponse('Campo de archivo inesperado.', 400)
        );
      default:
        return res.status(400).json(
          errorResponse(`Error de subida: ${err.message}`, 400)
        );
    }
  }

  if (err) {
    return res.status(400).json(
      errorResponse(err.message || 'Error al procesar el archivo.', 400)
    );
  }

  next();
}

/**
 * Middleware para validar tamaño de archivo post-upload según membresía
 */
function validateFileSizeByMembership(req, res, next) {
  if (!req.file) return next();

  const maxSize = getMaxFileSize(req);

  if (req.file.size > maxSize) {
    // Eliminar el archivo subido
    const fs = require('fs');
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.error('Error eliminando archivo excedido:', e.message);
    }

    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    return res.status(413).json(
      errorResponse(
        `El archivo (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) excede el límite de ${maxMB} MB para tu plan.`,
        413
      )
    );
  }

  next();
}

module.exports = {
  uploadTemplate,
  uploadContent,
  uploadGeneral,
  handleMulterError,
  validateFileSizeByMembership,
  storage
};
