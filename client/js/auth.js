/* ============================================
   DocPlant 🌱 — Manejador de Autenticación
   auth.js — Login, registro, validación, contraseña
   ============================================ */

const Auth = (() => {
  'use strict';

  /* =========================
     INICIALIZACIÓN
     ========================= */

  /**
   * Inicializa los manejadores de formularios de autenticación
   */
  function init() {
    const page = document.body.dataset.page;

    if (page === 'login') {
      initLoginForm();
    } else if (page === 'register') {
      initRegisterForm();
    }

    // Toggle de mostrar/ocultar contraseña (en ambas páginas)
    initPasswordToggles();

    // Botones de login social (próximamente)
    initSocialButtons();
  }

  /* =========================
     FORMULARIO DE LOGIN
     ========================= */

  /**
   * Inicializa el formulario de inicio de sesión
   */
  function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Obtener valores
      const email = document.getElementById('login-email')?.value.trim();
      const password = document.getElementById('login-password')?.value;
      const remember = document.getElementById('login-remember')?.checked;

      // Validar campos
      let hasError = false;

      if (!email || !isValidEmail(email)) {
        showFieldError('login-email', 'Introduce un correo electrónico válido');
        hasError = true;
      } else {
        clearFieldError('login-email');
      }

      if (!password || password.length < 1) {
        showFieldError('login-password', 'Introduce tu contraseña');
        hasError = true;
      } else {
        clearFieldError('login-password');
      }

      if (hasError) return;

      // Enviar petición de login
      const submitBtn = form.querySelector('button[type="submit"]');
      setButtonLoading(submitBtn, true, 'Iniciando sesión...');

      try {
        const response = await API.auth.login(email, password);

        if (response && response.token) {
          // Si "recordarme" no está marcado, usar sessionStorage
          if (!remember) {
            sessionStorage.setItem('docplant_session', 'true');
          }

          App.showToast('¡Bienvenido de vuelta!', 'success');

          // Redirigir al dashboard o página principal
          setTimeout(() => {
            window.location.href = '/client/dashboard.html';
          }, 500);
        }
      } catch (error) {
        const message = error.status === 401
          ? 'Correo o contraseña incorrectos'
          : (error.message || 'Error al iniciar sesión');
        App.showToast(message, 'error');

        // Resaltar campos
        if (error.status === 401) {
          showFieldError('login-email', '');
          showFieldError('login-password', 'Credenciales incorrectas');
        }
      } finally {
        setButtonLoading(submitBtn, false, 'Iniciar Sesión');
      }
    });
  }

  /* =========================
     FORMULARIO DE REGISTRO
     ========================= */

  /**
   * Inicializa el formulario de registro
   */
  function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    // Indicador de fuerza de contraseña
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        updatePasswordStrength(passwordInput.value);
      });
    }

    // Validación en tiempo real del confirm password
    const confirmInput = document.getElementById('register-confirm');
    if (confirmInput && passwordInput) {
      confirmInput.addEventListener('input', () => {
        if (confirmInput.value && confirmInput.value !== passwordInput.value) {
          showFieldError('register-confirm', 'Las contraseñas no coinciden');
        } else {
          clearFieldError('register-confirm');
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Obtener valores
      const name = document.getElementById('register-name')?.value.trim();
      const email = document.getElementById('register-email')?.value.trim();
      const password = document.getElementById('register-password')?.value;
      const confirm = document.getElementById('register-confirm')?.value;
      const terms = document.getElementById('register-terms')?.checked;

      // Validaciones
      let hasError = false;

      if (!name || name.length < 2) {
        showFieldError('register-name', 'Introduce tu nombre (mínimo 2 caracteres)');
        hasError = true;
      } else {
        clearFieldError('register-name');
      }

      if (!email || !isValidEmail(email)) {
        showFieldError('register-email', 'Introduce un correo electrónico válido');
        hasError = true;
      } else {
        clearFieldError('register-email');
      }

      if (!password || password.length < 6) {
        showFieldError('register-password', 'La contraseña debe tener al menos 6 caracteres');
        hasError = true;
      } else {
        clearFieldError('register-password');
      }

      if (password !== confirm) {
        showFieldError('register-confirm', 'Las contraseñas no coinciden');
        hasError = true;
      } else {
        clearFieldError('register-confirm');
      }

      if (!terms) {
        App.showToast('Debes aceptar los términos y condiciones', 'warning');
        hasError = true;
      }

      if (hasError) return;

      // Enviar petición de registro
      const submitBtn = form.querySelector('button[type="submit"]');
      setButtonLoading(submitBtn, true, 'Creando cuenta...');

      try {
        const response = await API.auth.register(name, email, password);

        if (response && response.token) {
          App.showToast('¡Cuenta creada exitosamente!', 'success');

          setTimeout(() => {
            window.location.href = '/client/dashboard.html';
          }, 500);
        }
      } catch (error) {
        let message = 'Error al crear la cuenta';
        if (error.status === 409) {
          message = 'Ya existe una cuenta con este correo electrónico';
          showFieldError('register-email', message);
        } else if (error.message) {
          message = error.message;
        }
        App.showToast(message, 'error');
      } finally {
        setButtonLoading(submitBtn, false, 'Crear Cuenta');
      }
    });
  }

  /* =========================
     FUERZA DE CONTRASEÑA
     ========================= */

  /**
   * Actualiza el indicador visual de fuerza de la contraseña
   * @param {string} password - Contraseña a evaluar
   */
  function updatePasswordStrength(password) {
    const strengthContainer = document.getElementById('password-strength');
    const strengthText = document.getElementById('password-strength-text');
    if (!strengthContainer) return;

    const strength = calculatePasswordStrength(password);

    strengthContainer.dataset.strength = strength.level;
    if (strengthText) {
      const labels = {
        weak: 'Débil',
        medium: 'Media',
        strong: 'Fuerte'
      };
      const colors = {
        weak: 'var(--color-error)',
        medium: 'var(--color-warning)',
        strong: 'var(--color-success)'
      };
      strengthText.textContent = password.length > 0 ? labels[strength.level] : '';
      strengthText.style.color = colors[strength.level] || '';
    }
  }

  /**
   * Calcula la fuerza de una contraseña
   * @param {string} password
   * @returns {Object} { level: 'weak'|'medium'|'strong', score: number }
   */
  function calculatePasswordStrength(password) {
    let score = 0;

    if (password.length === 0) return { level: 'weak', score: 0 };
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    let level = 'weak';
    if (score >= 4) level = 'strong';
    else if (score >= 2) level = 'medium';

    return { level, score };
  }

  /* =========================
     TOGGLE DE CONTRASEÑA
     ========================= */

  /**
   * Inicializa los toggles de mostrar/ocultar contraseña
   */
  function initPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const targetId = toggle.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        // Actualizar icono
        toggle.innerHTML = isPassword
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      });
    });
  }

  /* =========================
     BOTONES SOCIALES
     ========================= */

  /**
   * Inicializa los botones de login social (próximamente)
   */
  function initSocialButtons() {
    const googleBtns = document.querySelectorAll('.btn-google-login');
    googleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        App.showToast('Inicio de sesión con Google estará disponible próximamente', 'info');
      });
    });
  }

  /* =========================
     VALIDACIÓN DE CAMPOS
     ========================= */

  /**
   * Valida si un email tiene formato correcto
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Muestra un error visual en un campo de formulario
   * @param {string} inputId - ID del input
   * @param {string} message - Mensaje de error
   */
  function showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const group = input.closest('.form-group');
    if (group) {
      group.classList.add('error');
      const errorEl = group.querySelector('.form-error');
      if (errorEl && message) {
        errorEl.textContent = message;
      }
    }
  }

  /**
   * Limpia el error visual de un campo
   * @param {string} inputId - ID del input
   */
  function clearFieldError(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const group = input.closest('.form-group');
    if (group) {
      group.classList.remove('error');
    }
  }

  /**
   * Establece el estado de carga de un botón
   * @param {HTMLElement} button
   * @param {boolean} loading
   * @param {string} text - Texto del botón
   */
  function setButtonLoading(button, loading, text) {
    if (!button) return;

    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.innerHTML = `<div class="spinner spinner-sm"></div> ${text}`;
    } else {
      button.disabled = false;
      button.textContent = text || button.dataset.originalText || 'Enviar';
    }
  }

  /* =========================
     CIERRE DE SESIÓN
     ========================= */

  /**
   * Manejador de cierre de sesión
   */
  async function handleLogout() {
    App.showLoading('Cerrando sesión...');
    try {
      await API.auth.logout();
    } catch (error) {
      console.warn('Error al cerrar sesión:', error);
    }
    App.hideLoading();
    API.clearToken();
    window.location.href = '/client/index.html';
  }

  /* =========================
     API PÚBLICA
     ========================= */
  return {
    init,
    isValidEmail,
    calculatePasswordStrength,
    handleLogout
  };
})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', Auth.init);
