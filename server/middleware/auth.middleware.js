/**
 * DocPlant 🌱 - Middleware de Autenticación
 * 
 * Maneja la verificación JWT, sesiones anónimas y permisos de administrador.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Client = require('../models/Client');
const Session = require('../models/Session');
const { getClientIP, errorResponse, generateSessionToken } = require('../utils/helpers');

/**
 * Middleware: Autenticación obligatoria
 * Verifica el token JWT y adjunta el usuario al request.
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        errorResponse('Token de autenticación requerido. Inicia sesión para continuar.', 401)
      );
    }

    const token = authHeader.split(' ')[1];

    // Verificar el token JWT
    const decoded = jwt.verify(token, config.jwt.secret);

    // Buscar el cliente en la base de datos
    const client = Client.findById(decoded.id);

    if (!client) {
      return res.status(401).json(
        errorResponse('Usuario no encontrado o cuenta desactivada.', 401)
      );
    }

    if (!client.is_active) {
      return res.status(403).json(
        errorResponse('Tu cuenta ha sido desactivada. Contacta al administrador.', 403)
      );
    }

    // Adjuntar datos del usuario al request
    req.user = {
      id: client.id,
      name: client.name,
      email: client.email,
      membership: client.membership,
      daily_uploads_used: client.daily_uploads_used,
      is_active: client.is_active
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(
        errorResponse('Tu sesión ha expirado. Inicia sesión nuevamente.', 401)
      );
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(
        errorResponse('Token de autenticación inválido.', 401)
      );
    }

    console.error('Error en autenticación:', error.message);
    return res.status(500).json(
      errorResponse('Error interno de autenticación.', 500)
    );
  }
}

/**
 * Middleware: Autenticación opcional
 * Intenta verificar JWT pero no falla si no hay token.
 * También maneja sesiones anónimas mediante cookie o header.
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Intentar autenticación JWT
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const client = Client.findById(decoded.id);

        if (client && client.is_active) {
          req.user = {
            id: client.id,
            name: client.name,
            email: client.email,
            membership: client.membership,
            daily_uploads_used: client.daily_uploads_used,
            is_active: client.is_active
          };
        }
      } catch (jwtError) {
        // Token inválido o expirado, continuar como anónimo
      }
    }

    // Manejar sesión anónima si no hay usuario autenticado
    if (!req.user) {
      const sessionToken = req.headers['x-session-token'] || req.query.session_token;

      if (sessionToken) {
        const session = Session.findByToken(sessionToken);
        if (session) {
          req.session = session;
          req.sessionToken = sessionToken;

          // Si la sesión tiene un cliente asociado, cargar sus datos
          if (session.client_id) {
            const client = Client.findById(session.client_id);
            if (client && client.is_active) {
              req.user = {
                id: client.id,
                name: client.name,
                email: client.email,
                membership: client.membership,
                daily_uploads_used: client.daily_uploads_used,
                is_active: client.is_active
              };
            }
          }
        }
      }

      // Si aún no hay sesión, crear una anónima
      if (!req.session && !req.user) {
        const newSession = createAnonymousSession(req);
        req.session = newSession;
        req.sessionToken = newSession.session_token;
      }
    }

    next();
  } catch (error) {
    console.error('Error en autenticación opcional:', error.message);
    // No fallar, simplemente continuar sin usuario
    next();
  }
}

/**
 * Middleware: Solo administradores
 * Requiere que el usuario autenticado tenga membresía 'admin'.
 */
function adminOnly(req, res, next) {
  // Primero ejecutar la autenticación obligatoria
  authenticate(req, res, (err) => {
    if (err) return; // authenticate ya envió la respuesta de error

    if (!req.user) {
      return res.status(401).json(
        errorResponse('Autenticación requerida.', 401)
      );
    }

    if (req.user.membership !== 'admin') {
      return res.status(403).json(
        errorResponse('Acceso denegado. Se requieren permisos de administrador.', 403)
      );
    }

    next();
  });
}

/**
 * Crear una sesión anónima para usuarios no autenticados
 * @param {Object} req - Request de Express
 * @returns {Object} Sesión creada
 */
function createAnonymousSession(req) {
  const ip = getClientIP(req);

  try {
    const session = Session.create({
      ip_address: ip,
      client_id: null
    });

    return session;
  } catch (error) {
    console.error('Error creando sesión anónima:', error.message);
    // Retornar un objeto de sesión temporal en memoria
    return {
      session_token: generateSessionToken(),
      client_id: null,
      ip_address: ip,
      uploads_count: 0,
      is_active: 1
    };
  }
}

/**
 * Generar un token JWT para un cliente
 * @param {Object} client - Datos del cliente
 * @returns {string} Token JWT
 */
function generateToken(client) {
  return jwt.sign(
    {
      id: client.id,
      email: client.email,
      membership: client.membership
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
      algorithm: config.jwt.algorithm
    }
  );
}

module.exports = {
  authenticate,
  optionalAuth,
  adminOnly,
  createAnonymousSession,
  generateToken
};
