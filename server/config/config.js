/**
 * DocPlant 🌱 - Configuración del Servidor
 * 
 * Carga y exporta todas las variables de configuración
 * desde el archivo .env con valores por defecto seguros.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const config = {
  // === Servidor ===
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // === Rutas base ===
  basePath: path.join(__dirname, '..', '..'),
  uploadsPath: path.join(__dirname, '..', '..', 'uploads'),
  generatedPath: path.join(__dirname, '..', '..', 'generated'),
  databasePath: path.join(__dirname, '..', '..', 'database', 'docplant.db'),
  schemaPath: path.join(__dirname, '..', '..', 'database', 'schema.sql'),
  seedsPath: path.join(__dirname, '..', '..', 'database', 'seeds.sql'),
  clientPath: path.join(__dirname, '..', '..', 'client'),
  adminPath: path.join(__dirname, '..', '..', 'admin'),

  // === JWT ===
  jwt: {
    secret: process.env.JWT_SECRET || 'docplant_default_secret_key_2024',
    expiresIn: '24h',
    algorithm: 'HS256'
  },

  // === Límites de archivos ===
  files: {
    maxSizeFree: parseInt(process.env.MAX_FILE_SIZE_FREE, 10) || 10485760,       // 10MB
    maxSizePremium: parseInt(process.env.MAX_FILE_SIZE_PREMIUM, 10) || 52428800,  // 50MB
    allowedTemplateTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword',      // .doc
      'image/jpeg',              // .jpg/.jpeg
      'image/png',               // .png
      'application/pdf'          // .pdf
    ],
    allowedContentTypes: [
      'text/plain',              // .txt
      'application/json',        // .json
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword'       // .doc
    ],
    allowedExtensions: ['.docx', '.doc', '.txt', '.json', '.jpg', '.jpeg', '.png', '.pdf']
  },

  // === Límites de subida diaria ===
  uploads: {
    dailyLimitFree: parseInt(process.env.DAILY_UPLOAD_LIMIT_FREE, 10) || 5,
    dailyLimitPremium: parseInt(process.env.DAILY_UPLOAD_LIMIT_PREMIUM, 10) || 999
  },

  // === PayPal ===
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || 'sandbox_client_id',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || 'sandbox_secret',
    mode: process.env.PAYPAL_MODE || 'sandbox',
    baseUrl: process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  },

  // === Limpieza de archivos ===
  cleanup: {
    intervalMs: parseInt(process.env.FILE_CLEANUP_INTERVAL_MS, 10) || 3600000,  // 1 hora
    anonymousMaxAge: 24,   // horas
    registeredMaxAge: 72   // horas
  },

  // === Sesiones ===
  session: {
    expiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS, 10) || 24
  },

  // === Administrador por defecto ===
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@docplant.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    name: 'Administrador DocPlant'
  },

  // === Rate Limiting ===
  rateLimit: {
    windowMs: 15 * 60 * 1000,  // 15 minutos
    maxRequests: 100
  },

  // === Precios de membresía ===
  pricing: {
    premium: {
      monthly: 9.99,
      yearly: 99.99,
      currency: 'USD'
    }
  }
};

module.exports = config;
