/* ============================================
   DocPlant 🌱 — Lógica Principal de la Aplicación
   app.js — Inicialización, navegación, utilidades
   ============================================ */

const App = (() => {
  'use strict';

  // Estado global de la aplicación
  let currentUser = null;
  let isLoading = false;

  /* =========================
     INICIALIZACIÓN
     ========================= */

  /**
   * Punto de entrada principal — se ejecuta al cargar el DOM
   */
  function init() {
    // Verificar estado de autenticación
    checkAuthState();

    // Inicializar componentes comunes
    initNavbar();
    initScrollEffects();

    // Inicializar página específica según el data-page del body
    const page = document.body.dataset.page;
    switch (page) {
      case 'home':
        initHomePage();
        break;
      case 'login':
        // Se inicializa desde auth.js
        break;
      case 'register':
        // Se inicializa desde auth.js
        break;
      case 'dashboard':
        initDashboardPage();
        break;
      case 'pricing':
        initPricingPage();
        break;
    }

    // Manejador global de errores
    window.addEventListener('unhandledrejection', handleGlobalError);

    // Aplicar animaciones de entrada de página
    applyPageAnimations();
  }

  /* =========================
     ESTADO DE AUTENTICACIÓN
     ========================= */

  /**
   * Verifica si el usuario está autenticado y actualiza la UI
   */
  async function checkAuthState() {
    const token = API.getToken();
    if (!token) {
      updateNavbarForGuest();
      return;
    }

    try {
      const response = await API.auth.getSession();
      if (response && response.user) {
        currentUser = response.user;
        updateNavbarForUser(currentUser);
      } else {
        API.clearToken();
        updateNavbarForGuest();
      }
    } catch (error) {
      // Si falla la sesión, tratar como invitado
      console.warn('Error verificando sesión:', error);
      API.clearToken();
      updateNavbarForGuest();
    }
  }

  /**
   * Obtiene el usuario actual
   * @returns {Object|null}
   */
  function getUser() {
    return currentUser;
  }

  /**
   * Establece el usuario actual y actualiza la UI
   * @param {Object} user
   */
  function setUser(user) {
    currentUser = user;
    if (user) {
      updateNavbarForUser(user);
    } else {
      updateNavbarForGuest();
    }
  }

  /* =========================
     NAVBAR
     ========================= */

  /**
   * Inicializa la barra de navegación (menú móvil, scroll)
   */
  function initNavbar() {
    const toggle = document.getElementById('navbar-toggle');
    const mobileMenu = document.getElementById('navbar-mobile');

    if (toggle && mobileMenu) {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
      });

      // Cerrar menú al hacer clic en un enlace
      mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          toggle.classList.remove('active');
          mobileMenu.classList.remove('active');
        });
      });

      // Cerrar menú al hacer clic fuera
      document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !mobileMenu.contains(e.target)) {
          toggle.classList.remove('active');
          mobileMenu.classList.remove('active');
        }
      });
    }

    // Dropdown del usuario
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) {
      const trigger = userDropdown.querySelector('.navbar-user');
      if (trigger) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          userDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
          if (!userDropdown.contains(e.target)) {
            userDropdown.classList.remove('active');
          }
        });
      }
    }

    // Botón de cerrar sesión
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        showLoading('Cerrando sesión...');
        try {
          await API.auth.logout();
          currentUser = null;
          hideLoading();
          window.location.href = '/client/index.html';
        } catch (error) {
          hideLoading();
          API.clearToken();
          window.location.href = '/client/index.html';
        }
      });
    }
  }

  /**
   * Actualiza la navbar mostrando botones de login/registro
   */
  function updateNavbarForGuest() {
    const guestActions = document.getElementById('navbar-guest-actions');
    const userActions = document.getElementById('navbar-user-actions');
    const mobileGuest = document.getElementById('mobile-guest-actions');
    const mobileUser = document.getElementById('mobile-user-actions');

    if (guestActions) guestActions.classList.remove('hidden');
    if (userActions) userActions.classList.add('hidden');
    if (mobileGuest) mobileGuest.classList.remove('hidden');
    if (mobileUser) mobileUser.classList.add('hidden');
  }

  /**
   * Actualiza la navbar mostrando info del usuario
   * @param {Object} user - Datos del usuario
   */
  function updateNavbarForUser(user) {
    const guestActions = document.getElementById('navbar-guest-actions');
    const userActions = document.getElementById('navbar-user-actions');
    const mobileGuest = document.getElementById('mobile-guest-actions');
    const mobileUser = document.getElementById('mobile-user-actions');

    if (guestActions) guestActions.classList.add('hidden');
    if (userActions) userActions.classList.remove('hidden');
    if (mobileGuest) mobileGuest.classList.add('hidden');
    if (mobileUser) mobileUser.classList.remove('hidden');

    // Actualizar nombre y avatar
    const userName = document.getElementById('navbar-user-name');
    const userAvatar = document.getElementById('navbar-user-avatar');
    const mobileUserName = document.getElementById('mobile-user-name');

    if (userName) userName.textContent = user.name || 'Usuario';
    if (mobileUserName) mobileUserName.textContent = user.name || 'Usuario';

    if (userAvatar) {
      const initials = getInitials(user.name || 'U');
      userAvatar.textContent = initials;
    }

    // Actualizar nombre en dashboard si existe
    const dashName = document.getElementById('dashboard-user-name');
    if (dashName) dashName.textContent = user.name || 'Usuario';

    // Actualizar badge de membresía
    const memberBadge = document.getElementById('user-membership-badge');
    if (memberBadge) {
      if (user.plan === 'premium') {
        memberBadge.className = 'badge badge-premium';
        memberBadge.textContent = 'Premium';
      } else {
        memberBadge.className = 'badge badge-free';
        memberBadge.textContent = 'Gratis';
      }
    }
  }

  /* =========================
     SCROLL EFFECTS
     ========================= */

  /**
   * Inicializa efectos basados en el scroll
   */
  function initScrollEffects() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }, { passive: true });
    }
  }

  /* =========================
     SISTEMA DE TOASTS (Notificaciones)
     ========================= */

  /**
   * Muestra una notificación tipo toast
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duración en ms (default: 4000)
   */
  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // Iconos SVG para cada tipo
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    // Crear el elemento toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Cerrar">&times;</button>
      <div class="toast-progress" style="width: 100%"></div>
    `;

    container.appendChild(toast);

    // Botón de cierre
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Animación de la barra de progreso
    const progressBar = toast.querySelector('.toast-progress');
    requestAnimationFrame(() => {
      progressBar.style.transition = `width ${duration}ms linear`;
      progressBar.style.width = '0%';
    });

    // Auto-remover después de la duración
    const timer = setTimeout(() => removeToast(toast), duration);

    // Pausar al hacer hover
    toast.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      progressBar.style.transitionPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
      const remaining = (parseFloat(progressBar.style.width) / 100) * duration;
      setTimeout(() => removeToast(toast), Math.max(remaining, 500));
      progressBar.style.transitionPlayState = 'running';
    });
  }

  /**
   * Elimina un toast con animación
   * @param {HTMLElement} toast
   */
  function removeToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  /* =========================
     LOADING OVERLAY
     ========================= */

  /**
   * Muestra el overlay de carga
   * @param {string} text - Texto opcional a mostrar
   */
  function showLoading(text = 'Procesando...') {
    if (isLoading) return;
    isLoading = true;

    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="spinner spinner-lg"></div>
        <p class="loading-overlay-text" id="loading-text">${escapeHtml(text)}</p>
      `;
      document.body.appendChild(overlay);
    } else {
      const loadingText = overlay.querySelector('#loading-text');
      if (loadingText) loadingText.textContent = text;
    }

    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
  }

  /**
   * Oculta el overlay de carga
   */
  function hideLoading() {
    isLoading = false;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  /* =========================
     UTILIDADES DE FORMATO
     ========================= */

  /**
   * Formatea el tamaño de archivo a formato legible
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} Tamaño formateado (ej: "2.5 MB")
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
    return `${size} ${units[i]}`;
  }

  /**
   * Formatea una fecha ISO a formato legible en español
   * @param {string} isoDate - Fecha en formato ISO
   * @returns {string} Fecha formateada
   */
  function formatDate(isoDate) {
    if (!isoDate) return '—';
    const date = new Date(isoDate);
    const now = new Date();
    const diff = now - date;

    // Si es hace menos de 1 minuto
    if (diff < 60000) return 'Hace un momento';
    // Si es hace menos de 1 hora
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    // Si es hoy
    if (date.toDateString() === now.toDateString()) {
      return `Hoy ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
    }
    // Si es ayer
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
    }
    // Formato completo
    return date.toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Obtiene las iniciales de un nombre
   * @param {string} name - Nombre completo
   * @returns {string} Iniciales (máximo 2 letras)
   */
  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  /**
   * Escapa caracteres HTML para prevenir XSS
   * @param {string} str - Cadena a escapar
   * @returns {string} Cadena escapada
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* =========================
     ANIMACIONES DE PÁGINA
     ========================= */

  /**
   * Aplica animaciones de entrada a los elementos de la página
   */
  function applyPageAnimations() {
    const animatedElements = document.querySelectorAll('.animate-in');
    if (!animatedElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    animatedElements.forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  /* =========================
     INICIALIZACIÓN DE PÁGINAS ESPECÍFICAS
     ========================= */

  /**
   * Inicializa la página de inicio
   */
  function initHomePage() {
    // La herramienta de subida se inicializa desde upload.js
  }

  /**
   * Inicializa la página del dashboard
   */
  function initDashboardPage() {
    // Toggle del sidebar en móvil
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('dashboard-sidebar');

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });

      // Cerrar sidebar al hacer clic fuera
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992 &&
          !sidebar.contains(e.target) &&
          !sidebarToggle.contains(e.target)) {
          sidebar.classList.remove('active');
        }
      });
    }

    // Cargar datos del dashboard si el usuario está autenticado
    if (API.isAuthenticated()) {
      loadDashboardData();
    }
  }

  /**
   * Carga los datos del dashboard (stats, documentos recientes)
   */
  async function loadDashboardData() {
    try {
      const [stats, files] = await Promise.all([
        API.user.getStats().catch(() => null),
        API.user.getFiles().catch(() => null)
      ]);

      if (stats) {
        // Actualizar estadísticas
        const docsCount = document.getElementById('stat-docs-count');
        const uploadsToday = document.getElementById('stat-uploads-today');
        const membershipType = document.getElementById('stat-membership');

        if (docsCount) docsCount.textContent = stats.totalDocuments || 0;
        if (uploadsToday) uploadsToday.textContent = `${stats.uploadsToday || 0}/${stats.uploadLimit || 5}`;
        if (membershipType) membershipType.textContent = stats.plan === 'premium' ? 'Premium' : 'Gratis';
      }

      if (files && files.length > 0) {
        renderDocumentsTable(files);
      } else {
        showEmptyState();
      }
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    }
  }

  /**
   * Renderiza la tabla de documentos recientes
   * @param {Array} files - Lista de archivos del usuario
   */
  function renderDocumentsTable(files) {
    const tableBody = document.getElementById('documents-table-body');
    const emptyState = document.getElementById('documents-empty');

    if (!tableBody) return;

    if (emptyState) emptyState.classList.add('hidden');
    tableBody.innerHTML = '';

    files.forEach(file => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="flex items-center gap-sm">
            <span class="upload-file-icon ${getFileTypeClass(file.format)}" style="width:32px;height:32px;">
              ${getFileIcon(file.format)}
            </span>
            <span>${escapeHtml(file.name)}</span>
          </div>
        </td>
        <td><span class="tag">${(file.format || 'doc').toUpperCase()}</span></td>
        <td>${formatDate(file.createdAt)}</td>
        <td>${formatFileSize(file.size || 0)}</td>
        <td>
          <div class="flex gap-xs">
            <button class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="Descargar" onclick="App.downloadFile('${file.id}', '${file.format}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="Eliminar" onclick="App.deleteFile('${file.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  /**
   * Muestra el estado vacío cuando no hay documentos
   */
  function showEmptyState() {
    const tableWrapper = document.getElementById('documents-table-wrapper');
    const emptyState = document.getElementById('documents-empty');

    if (tableWrapper) tableWrapper.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
  }

  /**
   * Descarga un archivo del usuario
   * @param {string} fileId
   * @param {string} format
   */
  async function downloadFile(fileId, format) {
    try {
      const blob = await API.document.download(fileId, format || 'docx');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documento.${format || 'docx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Descarga iniciada', 'success');
    } catch (error) {
      showToast('Error al descargar el archivo', 'error');
    }
  }

  /**
   * Elimina un archivo del usuario
   * @param {string} fileId
   */
  async function deleteFile(fileId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) return;

    try {
      await API.upload.delete(fileId);
      showToast('Archivo eliminado correctamente', 'success');
      loadDashboardData(); // Recargar tabla
    } catch (error) {
      showToast('Error al eliminar el archivo', 'error');
    }
  }

  /**
   * Inicializa la página de precios
   */
  function initPricingPage() {
    const toggle = document.getElementById('pricing-toggle');
    if (!toggle) return;

    const monthlyLabel = document.getElementById('pricing-label-monthly');
    const yearlyLabel = document.getElementById('pricing-label-yearly');
    const track = document.getElementById('pricing-toggle-track');
    const priceElements = document.querySelectorAll('[data-price-monthly]');
    const yearlyNotes = document.querySelectorAll('.pricing-card-yearly');

    let isYearly = false;

    toggle.addEventListener('click', () => {
      isYearly = !isYearly;
      track.classList.toggle('active', isYearly);

      if (monthlyLabel) monthlyLabel.classList.toggle('active', !isYearly);
      if (yearlyLabel) yearlyLabel.classList.toggle('active', isYearly);

      // Actualizar precios
      priceElements.forEach(el => {
        const monthly = el.dataset.priceMonthly;
        const yearly = el.dataset.priceYearly;
        el.textContent = isYearly ? yearly : monthly;
      });

      // Mostrar/ocultar nota de ahorro anual
      yearlyNotes.forEach(note => {
        note.style.visibility = isYearly ? 'visible' : 'hidden';
      });
    });

    // Inicializar acordeón de FAQ
    initAccordion();
  }

  /**
   * Inicializa el componente de acordeón (FAQ)
   */
  function initAccordion() {
    const items = document.querySelectorAll('.accordion-item');
    items.forEach(item => {
      const header = item.querySelector('.accordion-header');
      if (header) {
        header.addEventListener('click', () => {
          const isActive = item.classList.contains('active');
          // Cerrar todos
          items.forEach(i => i.classList.remove('active'));
          // Abrir el clickeado si no estaba activo
          if (!isActive) {
            item.classList.add('active');
          }
        });
      }
    });
  }

  /* =========================
     UTILIDADES DE ARCHIVOS
     ========================= */

  /**
   * Obtiene la clase CSS según el tipo de archivo
   * @param {string} format
   * @returns {string}
   */
  function getFileTypeClass(format) {
    const map = {
      docx: 'docx', doc: 'docx',
      pdf: 'pdf',
      txt: 'txt',
      json: 'json',
      jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image'
    };
    return map[(format || '').toLowerCase()] || 'default';
  }

  /**
   * Obtiene un icono SVG según el tipo de archivo
   * @param {string} format
   * @returns {string} SVG HTML
   */
  function getFileIcon(format) {
    const icons = {
      docx: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      pdf: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      txt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      image: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
    };
    return icons[(format || '').toLowerCase()] || icons.txt;
  }

  /* =========================
     ERROR HANDLER GLOBAL
     ========================= */

  /**
   * Manejador de errores no capturados
   * @param {Event} event
   */
  function handleGlobalError(event) {
    console.error('Error no capturado:', event.reason);
    // No mostrar toast para errores de red silenciosos
    if (event.reason && event.reason.isNetworkError) {
      showToast('Error de conexión con el servidor', 'error');
    }
  }

  /* =========================
     API PÚBLICA
     ========================= */
  return {
    init,
    getUser,
    setUser,
    showToast,
    showLoading,
    hideLoading,
    formatFileSize,
    formatDate,
    getInitials,
    escapeHtml,
    getFileTypeClass,
    getFileIcon,
    downloadFile,
    deleteFile,
    initAccordion,
    checkAuthState
  };
})();

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', App.init);
