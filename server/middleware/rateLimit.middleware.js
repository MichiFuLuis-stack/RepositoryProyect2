/**
 * DocPlant 🌱 - Middleware de Rate Limiting
 * 
 * Limita las peticiones API y las subidas de archivos
 * según la membresía del usuario.
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const Client = require('../models/Client');
const Session = require('../models/Session');
const { errorResponse, getClientIP } = require('../utils/helpers');

/**
 * Rate limiter general para API
 * 100 peticiones por 15 minutos por IP
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutos
  max: config.rateLimit.maxRequests,     // 100 peticiones
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse(
    'Demasiadas peticiones desde esta IP. Intenta de nuevo en unos minutos.',
    429
  ),
  keyGenerator: (req) => {
    return getClientIP(req);
  },
  skip: (req) => {
    // Los admins no tienen rate limit en API
    return req.user && req.user.membership === 'admin';
  }
});

/**
 * Rate limiter estricto para autenticación
 * 10 intentos por 15 minutos por IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse(
    'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
    429
  ),
  keyGenerator: (req) => {
    return getClientIP(req);
  }
});

/**
 * Middleware: Verificar límite de subidas diarias
 * Valida según membresía (free: 5, premium: 999, admin: ilimitado)
 */
function uploadLimiter(req, res, next) {
  try {
    // Los administradores no tienen límite
    if (req.user && req.user.membership === 'admin') {
      return next();
    }

    // Determinar el límite según membresía
    const membership = req.user ? req.user.membership : 'free';
    const dailyLimit = membership === 'premium'
      ? config.uploads.dailyLimitPremium
      : config.uploads.dailyLimitFree;

    // Verificar subidas del usuario autenticado
    if (req.user) {
      const client = Client.findById(req.user.id);
      if (!client) {
        return res.status(401).json(
          errorResponse('Usuario no encontrado.', 401)
        );
      }

      // Verificar si necesita reinicio de conteo diario
      const lastReset = new Date(client.last_upload_reset);
      const now = new Date();
      const isNewDay = lastReset.toDateString() !== now.toDateString();

      let currentCount = client.daily_uploads_used;

      if (isNewDay) {
        // Reiniciar conteo al comenzar un nuevo día
        Client.resetDailyUploads();
        currentCount = 0;
      }

      if (currentCount >= dailyLimit) {
        const upgradeMsg = membership === 'free'
          ? ' Actualiza a Premium para obtener subidas ilimitadas.'
          : '';
        return res.status(429).json(
          errorResponse(
            `Has alcanzado el límite de ${dailyLimit} subidas diarias.${upgradeMsg}`,
            429
          )
        );
      }

      // Guardar info de uploads en el request para uso posterior
      req.uploadInfo = {
        currentCount,
        dailyLimit,
        remaining: dailyLimit - currentCount - 1
      };

      return next();
    }

    // Para usuarios anónimos, usar el conteo de la sesión
    if (req.session || req.sessionToken) {
      const sessionToken = req.sessionToken || (req.session && req.session.session_token);

      if (sessionToken) {
        const session = Session.findByToken(sessionToken);
        if (session && session.uploads_count >= dailyLimit) {
          return res.status(429).json(
            errorResponse(
              `Has alcanzado el límite de ${dailyLimit} subidas diarias. Regístrate para obtener más beneficios.`,
              429
            )
          );
        }

        req.uploadInfo = {
          currentCount: session ? session.uploads_count : 0,
          dailyLimit,
          remaining: session ? dailyLimit - session.uploads_count - 1 : dailyLimit - 1
        };
      }
    }

    next();
  } catch (error) {
    console.error('Error en upload limiter:', error.message);
    // En caso de error, permitir la subida pero loguear
    next();
  }
}

/**
 * Rate limiter para generación de documentos
 * 20 generaciones por 15 minutos
 */
const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse(
    'Demasiadas generaciones de documentos. Intenta de nuevo en unos minutos.',
    429
  ),
  keyGenerator: (req) => {
    return req.user ? `user_${req.user.id}` : getClientIP(req);
  },
  skip: (req) => {
    return req.user && req.user.membership === 'admin';
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  generationLimiter
};
