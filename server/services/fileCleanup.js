/**
 * DocPlant 🌱 - Servicio de Limpieza de Archivos
 * 
 * Gestiona la eliminación automática de archivos temporales
 * y expirados del sistema.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const UploadedFile = require('../models/UploadedFile');
const GeneratedFile = require('../models/GeneratedFile');
const Session = require('../models/Session');

// Variable para almacenar el intervalo de limpieza
let cleanupInterval = null;

/**
 * Limpiar archivos expirados
 * - Anónimos: 24 horas
 * - Registrados: 72 horas
 * @returns {Object} Resultados de la limpieza
 */
function cleanupExpiredFiles() {
  console.log('  🧹 Iniciando limpieza de archivos expirados...');
  
  const results = {
    uploadedDeleted: 0,
    generatedDeleted: 0,
    filesRemovedFromDisk: 0,
    sessionsCleared: 0,
    errors: []
  };

  try {
    // === Limpiar archivos de usuarios anónimos (24 horas) ===
    const anonMaxAge = config.cleanup.anonymousMaxAge;
    
    // Archivos subidos anónimos
    const oldAnonUploads = UploadedFile.getOldFiles(anonMaxAge, true);
    for (const file of oldAnonUploads) {
      try {
        // Eliminar del disco
        const fullPath = path.isAbsolute(file.file_path) 
          ? file.file_path 
          : path.join(config.basePath, file.file_path);
          
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          results.filesRemovedFromDisk++;
        }
        
        // Marcar como eliminado en BD
        UploadedFile.markDeleted(file.id);
        results.uploadedDeleted++;
      } catch (err) {
        results.errors.push(`Upload ${file.id}: ${err.message}`);
      }
    }

    // Archivos generados anónimos
    const oldAnonGenerated = GeneratedFile.getOldFiles(anonMaxAge, true);
    for (const file of oldAnonGenerated) {
      try {
        const fullPath = path.isAbsolute(file.file_path)
          ? file.file_path
          : path.join(config.basePath, file.file_path);
          
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          results.filesRemovedFromDisk++;
        }
        
        GeneratedFile.markDeleted(file.id);
        results.generatedDeleted++;
      } catch (err) {
        results.errors.push(`Generated ${file.id}: ${err.message}`);
      }
    }

    // === Limpiar archivos de usuarios registrados (72 horas) ===
    const regMaxAge = config.cleanup.registeredMaxAge;
    
    const oldRegUploads = UploadedFile.getOldFiles(regMaxAge, false);
    for (const file of oldRegUploads) {
      // Solo eliminar si ya fue marcado como eliminado lógicamente o es muy antiguo
      if (file.is_deleted) continue; // Ya procesado
      
      try {
        const fullPath = path.isAbsolute(file.file_path)
          ? file.file_path
          : path.join(config.basePath, file.file_path);
          
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          results.filesRemovedFromDisk++;
        }
        
        UploadedFile.markDeleted(file.id);
        results.uploadedDeleted++;
      } catch (err) {
        results.errors.push(`Upload reg ${file.id}: ${err.message}`);
      }
    }

    const oldRegGenerated = GeneratedFile.getOldFiles(regMaxAge, false);
    for (const file of oldRegGenerated) {
      if (file.is_deleted) continue;
      
      try {
        const fullPath = path.isAbsolute(file.file_path)
          ? file.file_path
          : path.join(config.basePath, file.file_path);
          
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          results.filesRemovedFromDisk++;
        }
        
        GeneratedFile.markDeleted(file.id);
        results.generatedDeleted++;
      } catch (err) {
        results.errors.push(`Generated reg ${file.id}: ${err.message}`);
      }
    }

    // === Limpiar sesiones expiradas ===
    const sessionResult = Session.cleanExpired();
    results.sessionsCleared = sessionResult.count;

    const totalCleaned = results.uploadedDeleted + results.generatedDeleted;
    if (totalCleaned > 0) {
      console.log(`  ✅ Limpieza completada: ${totalCleaned} archivos, ${results.sessionsCleared} sesiones`);
    } else {
      console.log('  ✅ Limpieza completada: nada que limpiar');
    }

  } catch (error) {
    console.error('  ❌ Error en limpieza:', error.message);
    results.errors.push(error.message);
  }

  return results;
}

/**
 * Limpiar todos los archivos de una sesión
 * @param {string} sessionId - Token de sesión
 * @returns {Object} Resultados
 */
function cleanupBySession(sessionId) {
  const results = { deleted: 0, errors: [] };

  try {
    // Archivos subidos
    const uploads = UploadedFile.findBySessionId(sessionId);
    for (const file of uploads) {
      try {
        const fullPath = path.isAbsolute(file.file_path)
          ? file.file_path
          : path.join(config.basePath, file.file_path);
          
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        UploadedFile.markDeleted(file.id);
        results.deleted++;
      } catch (err) {
        results.errors.push(err.message);
      }
    }

    // Archivos generados
    const generated = GeneratedFile.findBySessionId(sessionId);
    for (const file of generated) {
      try {
        const fullPath = path.isAbsolute(file.file_path)
          ? file.file_path
          : path.join(config.basePath, file.file_path);
          
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        GeneratedFile.markDeleted(file.id);
        results.deleted++;
      } catch (err) {
        results.errors.push(err.message);
      }
    }
  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

/**
 * Limpiar todos los archivos de un cliente
 * @param {number} clientId - ID del cliente
 * @returns {Object} Resultados
 */
function cleanupByClient(clientId) {
  const results = { deleted: 0, errors: [] };

  try {
    // Archivos subidos
    const uploadsResult = UploadedFile.findByClientId(clientId, { limit: 1000 });
    for (const file of uploadsResult.files) {
      try {
        const fullPath = path.isAbsolute(file.file_path)
          ? file.file_path
          : path.join(config.basePath, file.file_path);
          
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        UploadedFile.markDeleted(file.id);
        results.deleted++;
      } catch (err) {
        results.errors.push(err.message);
      }
    }

    // Archivos generados
    const generatedResult = GeneratedFile.findByClientId(clientId, { limit: 1000 });
    for (const file of generatedResult.files) {
      try {
        const fullPath = path.isAbsolute(file.file_path)
          ? file.file_path
          : path.join(config.basePath, file.file_path);
          
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        GeneratedFile.markDeleted(file.id);
        results.deleted++;
      } catch (err) {
        results.errors.push(err.message);
      }
    }
  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

/**
 * Obtener estadísticas de almacenamiento
 * @returns {Object} Estadísticas
 */
function getStorageStats() {
  const uploadStats = UploadedFile.getStats();
  const generatedStats = GeneratedFile.getStats();

  // Calcular espacio en disco real
  let uploadsOnDisk = 0;
  let generatedOnDisk = 0;

  try {
    if (fs.existsSync(config.uploadsPath)) {
      const files = fs.readdirSync(config.uploadsPath);
      for (const file of files) {
        try {
          const stat = fs.statSync(path.join(config.uploadsPath, file));
          uploadsOnDisk += stat.size;
        } catch (e) { /* ignorar */ }
      }
    }

    if (fs.existsSync(config.generatedPath)) {
      const files = fs.readdirSync(config.generatedPath);
      for (const file of files) {
        try {
          const stat = fs.statSync(path.join(config.generatedPath, file));
          generatedOnDisk += stat.size;
        } catch (e) { /* ignorar */ }
      }
    }
  } catch (error) {
    console.error('Error calculando almacenamiento en disco:', error.message);
  }

  return {
    database: {
      uploads: uploadStats,
      generated: generatedStats,
      totalSizeDB: uploadStats.totalSize + generatedStats.totalSize
    },
    disk: {
      uploadsSize: uploadsOnDisk,
      generatedSize: generatedOnDisk,
      totalSize: uploadsOnDisk + generatedOnDisk
    }
  };
}

/**
 * Programar limpieza automática periódica
 * @param {number} intervalMs - Intervalo en milisegundos
 */
function scheduleCleanup(intervalMs) {
  // Cancelar intervalo anterior si existe
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  const interval = intervalMs || config.cleanup.intervalMs;

  cleanupInterval = setInterval(() => {
    cleanupExpiredFiles();
  }, interval);

  const hours = (interval / 3600000).toFixed(1);
  console.log(`  ⏰ Limpieza automática programada cada ${hours} hora(s)`);

  // Ejecutar una limpieza inicial después de 30 segundos
  setTimeout(() => {
    cleanupExpiredFiles();
  }, 30000);
}

/**
 * Detener la limpieza automática
 */
function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('  ⏹️  Limpieza automática detenida');
  }
}

module.exports = {
  cleanupExpiredFiles,
  cleanupBySession,
  cleanupByClient,
  getStorageStats,
  scheduleCleanup,
  stopCleanup
};
