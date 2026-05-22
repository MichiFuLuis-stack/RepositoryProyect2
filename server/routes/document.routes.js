const express = require('express');
const router = express.Router();
const path = require('path');
const { optionalAuth } = require('../middleware/auth.middleware');
const UploadedFile = require('../models/UploadedFile');
const GeneratedFile = require('../models/GeneratedFile');
const { processDocument } = require('../services/documentProcessor');

// POST /api/document/generate
router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const { templateId, contentId, format = 'docx' } = req.body;

    if (!templateId || !contentId) {
      return res.status(400).json({ success: false, message: 'Se requiere una plantilla y un contenido' });
    }

    const template = UploadedFile.findById(templateId);
    const content = UploadedFile.findById(contentId);

    if (!template || !content) {
      return res.status(404).json({ success: false, message: 'Archivos no encontrados' });
    }

    // Ensure generated directory exists
    const fs = require('fs');
    const generatedDir = path.join(__dirname, '../../generated');
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }

    // Process document
    const result = await processDocument(template.file_path, content.file_path, format);
    
    if (!result.success) {
      throw new Error(result.error || 'Error desconocido al procesar');
    }

    const resultPath = result.filePath;
    const storedName = path.basename(resultPath);
    const originalName = `DocPlant_${path.basename(template.original_name, path.extname(template.original_name))}.${format}`;

    // Save to database
    const generatedFile = GeneratedFile.create({
      client_id: req.user ? req.user.id : null,
      session_id: req.sessionToken || 'anonymous',
      template_file_id: templateId,
      content_file_id: contentId,
      original_name: originalName,
      stored_name: storedName,
      format: format,
      file_size: fs.statSync(resultPath).size,
      file_path: resultPath
    });

    // Mark originals as processed
    UploadedFile.markProcessed(templateId);
    UploadedFile.markProcessed(contentId);

    res.json({
      success: true,
      message: 'Documento generado con éxito',
      file: { id: generatedFile.id, name: originalName, format }
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ success: false, message: 'Error al generar el documento: ' + error.message });
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', optionalAuth, (req, res) => {
  try {
    const file = GeneratedFile.findById(req.params.id);
    
    if (!file || file.is_deleted) {
      return res.status(404).json({ success: false, message: 'Documento no encontrado o expirado' });
    }

    GeneratedFile.markDownloaded(file.id);
    res.download(file.file_path, file.original_name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, message: 'Error al descargar el documento' });
  }
});

module.exports = router;
