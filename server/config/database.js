/**
 * DocPlant 🌱 - Configuración de Base de Datos
 * 
 * Inicializa SQLite usando better-sqlite3.
 * Ejecuta el esquema en la primera ejecución.
 * Exporta la instancia de la BD y funciones auxiliares.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');

// Asegurar que existe el directorio de la base de datos
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Crear instancia de la base de datos
const db = new Database(config.databasePath, {
  verbose: config.isDev ? null : null // Activar para debug: console.log
});

// Configuración de rendimiento para SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB de caché

/**
 * Inicializar la base de datos ejecutando el esquema SQL
 */
function initialize() {
  try {
    // Leer y ejecutar el esquema
    const schemaPath = config.schemaPath;
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      // Ejecutar cada sentencia por separado (better-sqlite3 no soporta múltiples en exec con triggers complejos)
      db.exec(schema);
      console.log('  ✅ Esquema de base de datos inicializado');
    } else {
      console.warn('  ⚠️  Archivo de esquema no encontrado:', schemaPath);
    }

    // Crear usuario administrador por defecto si no existe
    createDefaultAdmin();

    // Crear directorios necesarios
    ensureDirectories();

    console.log('  ✅ Base de datos lista');
  } catch (error) {
    // Si el error es por tablas que ya existen, ignorar
    if (error.message && error.message.includes('already exists')) {
      console.log('  ℹ️  Tablas ya existentes, omitiendo creación');
      createDefaultAdmin();
      ensureDirectories();
    } else {
      console.error('  ❌ Error inicializando base de datos:', error.message);
      throw error;
    }
  }
}

/**
 * Crear usuario administrador por defecto
 */
function createDefaultAdmin() {
  try {
    const existingAdmin = db.prepare('SELECT id FROM clients WHERE email = ?').get(config.admin.email);
    
    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(config.admin.password, salt);
      
      db.prepare(`
        INSERT INTO clients (name, email, password_hash, membership, is_active)
        VALUES (?, ?, ?, 'admin', 1)
      `).run(config.admin.name, config.admin.email, passwordHash);
      
      console.log('  ✅ Usuario administrador creado:', config.admin.email);
    } else {
      // Actualizar el hash del admin si el placeholder está presente
      const admin = db.prepare('SELECT password_hash FROM clients WHERE email = ?').get(config.admin.email);
      if (admin && admin.password_hash.includes('placeholder')) {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(config.admin.password, salt);
        db.prepare('UPDATE clients SET password_hash = ? WHERE email = ?').run(passwordHash, config.admin.email);
        console.log('  ✅ Hash de administrador actualizado');
      }
    }
  } catch (error) {
    console.error('  ⚠️  Error creando administrador:', error.message);
  }
}

/**
 * Ejecutar datos de prueba (seeds)
 */
function seed() {
  try {
    const seedsPath = config.seedsPath;
    if (fs.existsSync(seedsPath)) {
      // Primero actualizar los hashes de contraseñas de prueba
      const testUsers = [
        { email: 'maria@example.com', password: 'user123', name: 'María García', membership: 'free' },
        { email: 'carlos@example.com', password: 'premium123', name: 'Carlos López', membership: 'premium' },
        { email: 'ana.admin@docplant.com', password: 'superadmin123', name: 'Ana Martínez', membership: 'admin' }
      ];

      for (const user of testUsers) {
        const existing = db.prepare('SELECT id FROM clients WHERE email = ?').get(user.email);
        if (!existing) {
          const salt = bcrypt.genSaltSync(10);
          const hash = bcrypt.hashSync(user.password, salt);
          db.prepare(`
            INSERT INTO clients (name, email, password_hash, membership, is_active)
            VALUES (?, ?, ?, ?, 1)
          `).run(user.name, user.email, hash, user.membership);
        }
      }

      // Ejecutar el resto del seed SQL (sesiones, archivos, facturas)
      const seedSQL = fs.readFileSync(seedsPath, 'utf-8');
      // Filtrar solo las sentencias que no son INSERT de clients
      const lines = seedSQL.split(';').filter(stmt => {
        const trimmed = stmt.trim();
        return trimmed.length > 0 && 
               !trimmed.includes('INSERT OR IGNORE INTO clients');
      });

      for (const stmt of lines) {
        const trimmed = stmt.trim();
        if (trimmed.length > 5) {
          try {
            db.exec(trimmed + ';');
          } catch (e) {
            // Ignorar errores de datos duplicados
            if (!e.message.includes('UNIQUE constraint')) {
              console.warn('  ⚠️  Seed warning:', e.message);
            }
          }
        }
      }

      console.log('  ✅ Datos de prueba insertados');
    }
  } catch (error) {
    console.error('  ❌ Error ejecutando seeds:', error.message);
  }
}

/**
 * Asegurar que existen los directorios necesarios
 */
function ensureDirectories() {
  const dirs = [config.uploadsPath, config.generatedPath];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('  📁 Directorio creado:', path.basename(dir));
    }
  }
}

// ============================================
// Funciones auxiliares para consultas
// ============================================

/**
 * Obtener todos los resultados de una consulta
 * @param {string} sql - Consulta SQL
 * @param {Array} params - Parámetros
 * @returns {Array} Resultados
 */
function getAll(sql, params = []) {
  return db.prepare(sql).all(...params);
}

/**
 * Obtener un solo resultado
 * @param {string} sql - Consulta SQL
 * @param {Array} params - Parámetros
 * @returns {Object|undefined} Resultado
 */
function getOne(sql, params = []) {
  return db.prepare(sql).get(...params);
}

/**
 * Ejecutar una consulta de escritura (INSERT, UPDATE, DELETE)
 * @param {string} sql - Consulta SQL
 * @param {Array} params - Parámetros
 * @returns {Object} Resultado con changes y lastInsertRowid
 */
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

/**
 * Ejecutar múltiples operaciones en una transacción
 * @param {Function} fn - Función con las operaciones
 * @returns {*} Resultado de la función
 */
function transaction(fn) {
  return db.transaction(fn)();
}

/**
 * Cerrar la conexión a la base de datos
 */
function close() {
  db.close();
  console.log('  🔒 Conexión a base de datos cerrada');
}

// Cerrar BD al salir del proceso
process.on('exit', () => {
  try { db.close(); } catch (e) { /* ya cerrada */ }
});

process.on('SIGINT', () => {
  close();
  process.exit(0);
});

module.exports = {
  db,
  initialize,
  seed,
  getAll,
  getOne,
  run,
  transaction,
  close
};
