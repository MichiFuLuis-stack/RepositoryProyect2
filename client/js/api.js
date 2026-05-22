/* ============================================
   DocPlant 🌱 — Cliente API
   api.js — Wrapper para comunicación con el servidor
   ============================================ */

const API = (() => {
  'use strict';

  // URL base del API
  const BASE_URL = 'http://localhost:3000/api';

  // Clave para almacenar el token en localStorage
  const TOKEN_KEY = 'docplant_token';

  /* =========================
     GESTIÓN DE TOKEN
     ========================= */

  /**
   * Almacena el token de autenticación
   * @param {string} token - JWT token
   */
  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  /**
   * Obtiene el token almacenado
   * @returns {string|null} Token o null si no existe
   */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Elimina el token de autenticación
   */
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Verifica si el usuario tiene un token válido
   * @returns {boolean}
   */
  function isAuthenticated() {
    return !!getToken();
  }

  /* =========================
     PETICIÓN BASE (fetch wrapper)
     ========================= */

  /**
   * Realiza una petición HTTP al API
   * @param {string} method - Método HTTP (GET, POST, PUT, DELETE, PATCH)
   * @param {string} url - Ruta del endpoint (se concatena con BASE_URL)
   * @param {Object|FormData|null} data - Datos a enviar
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Respuesta parseada del servidor
   */
  async function request(method, url, data = null, options = {}) {
    const fullUrl = `${BASE_URL}${url}`;
    const token = getToken();

    // Configurar headers base
    const headers = {};

    // Agregar token de autorización si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Configurar la petición
    const config = {
      method: method.toUpperCase(),
      headers,
      ...options
    };

    // Agregar cuerpo de la petición según el tipo de dato
    if (data) {
      if (data instanceof FormData) {
        // Para FormData, no establecer Content-Type (el navegador lo hace automáticamente)
        config.body = data;
      } else {
        headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(fullUrl, config);

      // Intentar parsear la respuesta como JSON
      let responseData;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else if (response.status === 204) {
        // No Content
        responseData = null;
      } else {
        // Para descargas de archivos u otras respuestas no-JSON
        responseData = response;
      }

      // Verificar si la respuesta fue exitosa
      if (!response.ok) {
        const error = new Error(
          (responseData && responseData.message) || 
          `Error ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        error.data = responseData;

        // Si es un error 401, limpiar el token
        if (response.status === 401) {
          clearToken();
          // Redirigir al login si no estamos ya ahí
          if (!window.location.pathname.includes('login')) {
            window.location.href = '/client/login.html';
          }
        }

        throw error;
      }

      return responseData;
    } catch (error) {
      // Error de red o error de parsing
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Error de conexión. Verifica tu conexión a internet.');
        networkError.status = 0;
        networkError.isNetworkError = true;
        throw networkError;
      }
      throw error;
    }
  }

  /* =========================
     MÓDULO DE AUTENTICACIÓN
     ========================= */
  const auth = {
    /**
     * Iniciar sesión con email y contraseña
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>} Datos del usuario y token
     */
    async login(email, password) {
      const response = await request('POST', '/auth/login', { email, password });
      if (response && response.token) {
        setToken(response.token);
      }
      return response;
    },

    /**
     * Registrar un nuevo usuario
     * @param {string} name - Nombre completo
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>} Datos del usuario creado y token
     */
    async register(name, email, password) {
      const response = await request('POST', '/auth/register', { name, email, password });
      if (response && response.token) {
        setToken(response.token);
      }
      return response;
    },

    /**
     * Cerrar sesión
     * @returns {Promise<void>}
     */
    async logout() {
      try {
        await request('POST', '/auth/logout');
      } catch (error) {
        // Ignorar errores al cerrar sesión; limpiar token de todas formas
        console.warn('Error al cerrar sesión en el servidor:', error);
      }
      clearToken();
    },

    /**
     * Obtener la sesión actual del usuario
     * @returns {Promise<Object>} Datos del usuario autenticado
     */
    async getSession() {
      return await request('GET', '/auth/session');
    }
  };

  /* =========================
     MÓDULO DE SUBIDA DE ARCHIVOS
     ========================= */
  const upload = {
    /**
     * Subir archivo de plantilla (modelo)
     * @param {File} file - Archivo de plantilla
     * @returns {Promise<Object>} Datos del archivo subido
     */
    async template(file) {
      const formData = new FormData();
      formData.append('template', file);
      return await request('POST', '/upload/template', formData);
    },

    /**
     * Subir archivo de contenido
     * @param {File} file - Archivo de contenido (.txt, .json)
     * @returns {Promise<Object>} Datos del archivo subido
     */
    async content(file) {
      const formData = new FormData();
      formData.append('content', file);
      return await request('POST', '/upload/content', formData);
    },

    /**
     * Enviar contenido como texto plano
     * @param {string} text - Texto del contenido
     * @returns {Promise<Object>} Datos del contenido procesado
     */
    async contentText(text) {
      return await request('POST', '/upload/content-text', { text });
    },

    /**
     * Eliminar un archivo subido
     * @param {string} id - ID del archivo
     * @returns {Promise<void>}
     */
    async delete(id) {
      return await request('DELETE', `/upload/${id}`);
    },

    /**
     * Obtener estado de las subidas del usuario
     * @returns {Promise<Object>} Estado con conteos y límites
     */
    async status() {
      return await request('GET', '/upload/status');
    }
  };

  /* =========================
     MÓDULO DE DOCUMENTOS
     ========================= */
  const document = {
    /**
     * Generar un documento a partir de plantilla y contenido
     * @param {string} templateId - ID de la plantilla subida
     * @param {string} contentId - ID del contenido subido
     * @returns {Promise<Object>} Datos del documento generado
     */
    async generate(templateId, contentId) {
      return await request('POST', '/documents/generate', {
        templateId,
        contentId
      });
    },

    /**
     * Descargar un documento en el formato especificado
     * @param {string} id - ID del documento
     * @param {string} format - Formato de descarga (docx, pdf)
     * @returns {Promise<Blob>} Archivo binario para descargar
     */
    async download(id, format) {
      const token = getToken();
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}/documents/${id}/download?format=${format}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // No se pudo parsear el error como JSON
        }
        throw new Error(errorMessage);
      }

      return await response.blob();
    },

    /**
     * Obtener vista previa de un documento
     * @param {string} id - ID del documento
     * @returns {Promise<Object>} Datos de previsualización
     */
    async preview(id) {
      return await request('GET', `/documents/${id}/preview`);
    }
  };

  /* =========================
     MÓDULO DE USUARIO
     ========================= */
  const user = {
    /**
     * Obtener perfil del usuario
     * @returns {Promise<Object>} Datos del perfil
     */
    async getProfile() {
      return await request('GET', '/user/profile');
    },

    /**
     * Actualizar perfil del usuario
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} Perfil actualizado
     */
    async updateProfile(data) {
      return await request('PUT', '/user/profile', data);
    },

    /**
     * Obtener archivos del usuario
     * @returns {Promise<Array>} Lista de archivos
     */
    async getFiles() {
      return await request('GET', '/user/files');
    },

    /**
     * Obtener estadísticas del usuario
     * @returns {Promise<Object>} Estadísticas (documentos generados, subidas, etc.)
     */
    async getStats() {
      return await request('GET', '/user/stats');
    }
  };

  /* =========================
     MÓDULO DE PAGOS
     ========================= */
  const payment = {
    /**
     * Crear una orden de pago (PayPal)
     * @param {string} plan - Plan seleccionado (monthly, yearly)
     * @returns {Promise<Object>} Datos de la orden (orderID, approvalUrl)
     */
    async createOrder(plan) {
      return await request('POST', '/payments/create-order', { plan });
    },

    /**
     * Capturar una orden de pago aprobada
     * @param {string} orderId - ID de la orden de PayPal
     * @returns {Promise<Object>} Confirmación de pago
     */
    async captureOrder(orderId) {
      return await request('POST', '/payments/capture-order', { orderId });
    }
  };

  /* =========================
     API PÚBLICA
     ========================= */
  return {
    setToken,
    getToken,
    clearToken,
    isAuthenticated,
    request,
    auth,
    upload,
    document,
    user,
    payment
  };
})();
