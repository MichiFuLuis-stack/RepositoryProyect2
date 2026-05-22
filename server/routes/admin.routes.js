const express = require('express');
const router = express.Router();
const os = require('os');
const db = require('../config/database');
const { adminOnly } = require('../middleware/auth.middleware');
const Client = require('../models/Client');
const UploadedFile = require('../models/UploadedFile');
const GeneratedFile = require('../models/GeneratedFile');

// Apply admin protection to all routes
router.use(adminOnly);

// GET /api/admin/dashboard
router.get('/dashboard', (req, res) => {
  try {
    const totalClients = Client.count();
    const storageStats = UploadedFile.getStats();
    
    res.json({
      success: true,
      stats: {
        totalClients,
        totalFilesProcessed: storageStats.totalFiles,
        storageUsed: storageStats.totalSize,
        activeSessions: 5 // Mock for now
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/server
router.get('/server', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  
  res.json({
    success: true,
    stats: {
      cpu: os.cpus()[0].model,
      cpuUsage: Math.round(process.cpuUsage().user / 1000000), // very rough estimate
      memoryTotal: totalMem,
      memoryUsed: totalMem - freeMem,
      memoryFree: freeMem,
      uptime: os.uptime(),
      platform: os.platform(),
      nodeVersion: process.version
    }
  });
});

// GET /api/admin/database/:table
router.get('/database/:table', (req, res) => {
  try {
    const table = req.params.table;
    const allowedTables = ['clients', 'uploaded_files', 'generated_files', 'invoices', 'sessions'];
    
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ success: false, message: 'Tabla no permitida' });
    }

    const data = db.getAll(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 50`);
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/database/:table/:id
router.delete('/database/:table/:id', (req, res) => {
  try {
    const table = req.params.table;
    const id = req.params.id;
    const allowedTables = ['clients', 'uploaded_files', 'generated_files', 'invoices', 'sessions'];
    
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ success: false, message: 'Tabla no permitida' });
    }

    const result = db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    res.json({ success: true, message: 'Registro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
