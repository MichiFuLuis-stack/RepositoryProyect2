const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { uploadTemplate, uploadContent } = require('../middleware/upload.middleware');
const { optionalAuth } = require('../middleware/auth.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');
const UploadedFile = require('../models/UploadedFile');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// POST /api/upload/template
router.post('/template', optionalAuth, uploadLimiter, uploadTemplate.single('template'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }

    const uploadedFile = UploadedFile.create({
      client_id: req.user ? req.user.id : null,
      session_id: req.sessionToken || 'anonymous',
      original_name: req.file.originalname,
      stored_name: req.file.filename,
      file_type: 'template',
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      file_path: req.file.path
    });

    res.json({
      success: true,
      message: 'Plantilla subida con éxito',
      file: { id: uploadedFile.id, original_name: req.file.originalname, size: req.file.size }
    });
  } catch (error) {
    console.error('Upload template error:', error);
    res.status(500).json({ success: false, message: 'Error al subir la plantilla' });
  }
});

// POST /api/upload/content
router.post('/content', optionalAuth, uploadLimiter, uploadContent.single('content'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }

    const uploadedFile = UploadedFile.create({
      client_id: req.user ? req.user.id : null,
      session_id: req.sessionToken || 'anonymous',
      original_name: req.file.originalname,
      stored_name: req.file.filename,
      file_type: 'content',
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      file_path: req.file.path
    });

    res.json({
      success: true,
      message: 'Contenido subido con éxito',
      file: { id: uploadedFile.id, original_name: req.file.originalname, size: req.file.size }
    });
  } catch (error) {
    console.error('Upload content error:', error);
    res.status(500).json({ success: false, message: 'Error al subir el contenido' });
  }
});

module.exports = router;
