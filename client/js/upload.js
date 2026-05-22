/* ============================================
   DocPlant 🌱 — Manejador de Subida
   upload.js — Drag & drop, subida, generación de documentos
   ============================================ */

const Upload = (() => {
  'use strict';

  // Estado de la herramienta de subida
  let templateFile = null;     // Archivo de plantilla seleccionado
  let contentFile = null;      // Archivo de contenido seleccionado
  let templateUploadId = null; // ID del template subido al servidor
  let contentUploadId = null;  // ID del contenido subido al servidor
  let generatedDocId = null;   // ID del documento generado
  let currentTab = 'file';     // Tab activa: 'file' o 'text'

  // Tipos de archivo permitidos
  const TEMPLATE_TYPES = ['.docx', '.doc', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const CONTENT_TYPES = ['.txt', '.json', '.md'];
  const MAX_FILE_SIZE_FREE = 10 * 1024 * 1024;      // 10 MB
  const MAX_FILE_SIZE_PREMIUM = 50 * 1024 * 1024;    // 50 MB

  /* =========================
     INICIALIZACIÓN
     ========================= */

  /**
   * Inicializa las zonas de drag & drop y todos los manejadores
   */
  function init() {
    // Zona de plantilla (template)
    const templateZone = document.getElementById('template-zone');
    const templateInput = document.getElementById('template-input');

    // Zona de contenido (archivo)
    const contentZone = document.getElementById('content-zone');
    const contentInput = document.getElementById('content-input');

    // Textarea de contenido directo
    const contentTextarea = document.getElementById('content-textarea');
    const textCounter = document.getElementById('text-counter');

    // Tabs de contenido
    const tabFile = document.getElementById('tab-content-file');
    const tabText = document.getElementById('tab-content-text');

    // Botón generar
    const generateBtn = document.getElementById('generate-btn');

    // Botones de descarga
    const downloadDocx = document.getElementById('download-docx');
    const downloadPdf = document.getElementById('download-pdf');
    const newDocBtn = document.getElementById('new-document-btn');

    // Inicializar zona de plantilla
    if (templateZone && templateInput) {
      initDropZone(templateZone, templateInput, 'template');
    }

    // Inicializar zona de contenido (archivo)
    if (contentZone && contentInput) {
      initDropZone(contentZone, contentInput, 'content');
    }

    // Inicializar tabs de contenido
    if (tabFile && tabText) {
      tabFile.addEventListener('click', () => switchTab('file'));
      tabText.addEventListener('click', () => switchTab('text'));
    }

    // Contador de texto
    if (contentTextarea && textCounter) {
      contentTextarea.addEventListener('input', () => {
        const len = contentTextarea.value.length;
        textCounter.textContent = `${len.toLocaleString()} caracteres`;
        updateGenerateButton();
      });
    }

    // Botón generar
    if (generateBtn) {
      generateBtn.addEventListener('click', handleGenerate);
    }

    // Botones de descarga
    if (downloadDocx) {
      downloadDocx.addEventListener('click', () => handleDownload('docx'));
    }
    if (downloadPdf) {
      downloadPdf.addEventListener('click', () => handleDownload('pdf'));
    }

    // Botón nuevo documento
    if (newDocBtn) {
      newDocBtn.addEventListener('click', resetAll);
    }

    // Estado inicial del botón
    updateGenerateButton();
  }

  /* =========================
     DRAG & DROP
     ========================= */

  /**
   * Inicializa una zona de drag & drop
   * @param {HTMLElement} zone - Elemento de la zona
   * @param {HTMLInputElement} fileInput - Input de archivo oculto
   * @param {string} type - Tipo: 'template' o 'content'
   */
  function initDropZone(zone, fileInput, type) {
    // Click para seleccionar archivo
    zone.addEventListener('click', (e) => {
      // No abrir selector si ya hay un archivo (excepto si clickea el zone directamente)
      if (zone.classList.contains('has-file') && !e.target.closest('.upload-zone-text')) return;
      fileInput.click();
    });

    // Cambio en el input de archivo
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleFileSelect(file, type);
      }
    });

    // Eventos de drag & drop
    zone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('dragging');
    });

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('dragging');
    });

    zone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Solo remover si realmente salimos de la zona
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('dragging');
      }
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('dragging');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0], type);
      }
    });
  }

  /* =========================
     SELECCIÓN DE ARCHIVOS
     ========================= */

  /**
   * Maneja la selección de un archivo
   * @param {File} file - Archivo seleccionado
   * @param {string} type - 'template' o 'content'
   */
  function handleFileSelect(file, type) {
    // Validar tipo de archivo
    const allowedTypes = type === 'template' ? TEMPLATE_TYPES : CONTENT_TYPES;
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(ext)) {
      App.showToast(
        `Formato no válido. Formatos aceptados: ${allowedTypes.join(', ')}`,
        'error'
      );
      return;
    }

    // Validar tamaño
    const user = App.getUser();
    const maxSize = (user && user.plan === 'premium') ? MAX_FILE_SIZE_PREMIUM : MAX_FILE_SIZE_FREE;

    if (file.size > maxSize) {
      App.showToast(
        `El archivo excede el tamaño máximo (${App.formatFileSize(maxSize)})`,
        'error'
      );
      return;
    }

    // Almacenar el archivo
    if (type === 'template') {
      templateFile = file;
      templateUploadId = null; // Resetear ID de subida anterior
      showFilePreview('template', file);
    } else {
      contentFile = file;
      contentUploadId = null;
      showFilePreview('content', file);
    }

    // Actualizar estado del botón
    updateGenerateButton();
  }

  /**
   * Muestra la previsualización del archivo seleccionado
   * @param {string} type - 'template' o 'content'
   * @param {File} file - Archivo
   */
  function showFilePreview(type, file) {
    const zone = document.getElementById(`${type}-zone`);
    if (!zone) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const iconClass = getFileIconClass(ext);

    zone.classList.add('has-file');
    zone.innerHTML = `
      <div class="upload-file-preview">
        <div class="upload-file-icon ${iconClass}">
          ${getFileIconSvg(ext)}
        </div>
        <div class="upload-file-info">
          <div class="upload-file-name">${App.escapeHtml(file.name)}</div>
          <div class="upload-file-size">${App.formatFileSize(file.size)}</div>
        </div>
        <div class="upload-file-status success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <button class="upload-file-remove" id="${type}-remove" aria-label="Eliminar archivo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    // Manejador del botón eliminar
    const removeBtn = document.getElementById(`${type}-remove`);
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(type);
      });
    }
  }

  /**
   * Elimina un archivo seleccionado y restaura la zona
   * @param {string} type - 'template' o 'content'
   */
  function removeFile(type) {
    if (type === 'template') {
      templateFile = null;
      templateUploadId = null;
      restoreZone('template');
    } else {
      contentFile = null;
      contentUploadId = null;
      restoreZone('content');
    }

    // Resetear el input para permitir seleccionar el mismo archivo
    const input = document.getElementById(`${type}-input`);
    if (input) input.value = '';

    updateGenerateButton();
  }

  /**
   * Restaura una zona de subida a su estado original
   * @param {string} type - 'template' o 'content'
   */
  function restoreZone(type) {
    const zone = document.getElementById(`${type}-zone`);
    if (!zone) return;

    zone.classList.remove('has-file');

    if (type === 'template') {
      zone.innerHTML = `
        <svg class="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <p class="upload-zone-text">
          <strong>Arrastra tu plantilla aquí</strong> o haz clic para seleccionar
        </p>
        <p class="upload-zone-hint">Archivo modelo que define el formato del documento</p>
        <div class="upload-zone-formats">
          <span class="upload-zone-format">.docx</span>
          <span class="upload-zone-format">.doc</span>
          <span class="upload-zone-format">.jpg</span>
          <span class="upload-zone-format">.png</span>
        </div>
      `;
    } else {
      zone.innerHTML = `
        <svg class="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p class="upload-zone-text">
          <strong>Arrastra tu archivo de contenido</strong> o haz clic
        </p>
        <p class="upload-zone-hint">El texto que se insertará en la plantilla</p>
        <div class="upload-zone-formats">
          <span class="upload-zone-format">.txt</span>
          <span class="upload-zone-format">.json</span>
          <span class="upload-zone-format">.md</span>
        </div>
      `;
    }
  }

  /* =========================
     TABS DE CONTENIDO
     ========================= */

  /**
   * Cambia entre las tabs de archivo y texto
   * @param {string} tab - 'file' o 'text'
   */
  function switchTab(tab) {
    currentTab = tab;

    // Actualizar botones de tabs
    const tabFile = document.getElementById('tab-content-file');
    const tabText = document.getElementById('tab-content-text');
    const panelFile = document.getElementById('panel-content-file');
    const panelText = document.getElementById('panel-content-text');

    if (tabFile) tabFile.classList.toggle('active', tab === 'file');
    if (tabText) tabText.classList.toggle('active', tab === 'text');
    if (panelFile) panelFile.classList.toggle('active', tab === 'file');
    if (panelText) panelText.classList.toggle('active', tab === 'text');

    updateGenerateButton();
  }

  /* =========================
     SUBIDA CON PROGRESO
     ========================= */

  /**
   * Sube un archivo al servidor con seguimiento de progreso
   * @param {File} file - Archivo a subir
   * @param {string} type - 'template' o 'content'
   * @param {Function} onProgress - Callback de progreso (0-100)
   * @returns {Promise<Object>} Respuesta del servidor
   */
  function uploadFileWithProgress(file, type, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append(type, file);

      // Progreso de subida
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          if (onProgress) onProgress(percent);
        }
      });

      // Respuesta del servidor
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve({ success: true });
          }
        } else {
          let message = `Error ${xhr.status}`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            message = errorData.message || message;
          } catch (e) {
            // Usar mensaje por defecto
          }
          reject(new Error(message));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Error de conexión al subir el archivo'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Subida cancelada'));
      });

      // Configurar y enviar
      const endpoint = type === 'template' ? '/api/upload/template' : '/api/upload/content';
      xhr.open('POST', endpoint);

      // Agregar token de autenticación
      const token = API.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * Muestra la barra de progreso dentro de una zona
   * @param {string} type - 'template' o 'content'
   * @param {number} percent - Porcentaje (0-100)
   */
  function showProgress(type, percent) {
    const zone = document.getElementById(`${type}-zone`);
    if (!zone) return;

    let progress = zone.querySelector('.upload-progress');
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'upload-progress';
      progress.innerHTML = `
        <div class="upload-progress-bar">
          <div class="upload-progress-fill animated" style="width: 0%"></div>
        </div>
        <div class="upload-progress-text">
          <span>Subiendo...</span>
          <span class="progress-percent">0%</span>
        </div>
      `;
      zone.appendChild(progress);
    }

    const fill = progress.querySelector('.upload-progress-fill');
    const percentText = progress.querySelector('.progress-percent');
    if (fill) fill.style.width = `${percent}%`;
    if (percentText) percentText.textContent = `${percent}%`;
  }

  /**
   * Oculta la barra de progreso
   * @param {string} type
   */
  function hideProgress(type) {
    const zone = document.getElementById(`${type}-zone`);
    if (!zone) return;

    const progress = zone.querySelector('.upload-progress');
    if (progress) {
      progress.remove();
    }
  }

  /* =========================
     GENERAR DOCUMENTO
     ========================= */

  /**
   * Manejador principal del botón "Generar Documento"
   */
  async function handleGenerate() {
    const generateBtn = document.getElementById('generate-btn');
    if (!generateBtn) return;

    // Validar que tenemos plantilla
    if (!templateFile) {
      App.showToast('Debes seleccionar un archivo de plantilla', 'warning');
      return;
    }

    // Validar contenido según la tab activa
    const hasContent = currentTab === 'text'
      ? (document.getElementById('content-textarea')?.value.trim().length > 0)
      : (contentFile !== null);

    if (!hasContent) {
      App.showToast('Debes proporcionar contenido (archivo o texto)', 'warning');
      return;
    }

    // Estado de carga del botón
    setGenerateLoading(true);

    try {
      // Paso 1: Subir plantilla si no se ha subido
      if (!templateUploadId) {
        App.showToast('Subiendo plantilla...', 'info', 2000);
        showProgress('template', 0);

        const templateResponse = await uploadFileWithProgress(
          templateFile, 'template',
          (percent) => showProgress('template', percent)
        );

        templateUploadId = templateResponse.id || templateResponse.fileId || (templateResponse.file && templateResponse.file.id) || 'template_' + Date.now();
        hideProgress('template');
      }

      // Paso 2: Subir contenido
      if (!contentUploadId) {
        if (currentTab === 'text') {
          // Enviar texto directamente
          const text = document.getElementById('content-textarea')?.value.trim();
          App.showToast('Enviando contenido...', 'info', 2000);

          const contentResponse = await API.upload.contentText(text);
          contentUploadId = contentResponse.id || contentResponse.contentId || 'content_' + Date.now();
        } else {
          // Subir archivo de contenido
          App.showToast('Subiendo contenido...', 'info', 2000);
          showProgress('content', 0);

          const contentResponse = await uploadFileWithProgress(
            contentFile, 'content',
            (percent) => showProgress('content', percent)
          );

          contentUploadId = contentResponse.id || contentResponse.fileId || (contentResponse.file && contentResponse.file.id) || 'content_' + Date.now();
          hideProgress('content');
        }
      }

      // Paso 3: Generar documento
      App.showToast('Generando documento...', 'info', 3000);

      const result = await API.document.generate(templateUploadId, contentUploadId);
      generatedDocId = result.id || result.documentId || (result.file && result.file.id) || 'doc_' + Date.now();

      // Éxito: mostrar área de resultados
      showResult(result);
      App.showToast('¡Documento generado exitosamente!', 'success');

    } catch (error) {
      console.error('Error generando documento:', error);
      App.showToast(error.message || 'Error al generar el documento', 'error');
      hideProgress('template');
      hideProgress('content');
    } finally {
      setGenerateLoading(false);
    }
  }

  /**
   * Establece el estado de carga del botón generar
   * @param {boolean} loading
   */
  function setGenerateLoading(loading) {
    const btn = document.getElementById('generate-btn');
    if (!btn) return;

    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
      btn.innerHTML = `
        <div class="spinner"></div>
        <span>Generando...</span>
      `;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span>Generar Documento</span>
      `;
      updateGenerateButton();
    }
  }

  /**
   * Actualiza el estado visual del botón de generar
   */
  function updateGenerateButton() {
    const btn = document.getElementById('generate-btn');
    if (!btn) return;

    const hasTemplate = templateFile !== null;
    const hasContent = currentTab === 'text'
      ? (document.getElementById('content-textarea')?.value.trim().length > 0)
      : (contentFile !== null);

    const ready = hasTemplate && hasContent;
    btn.disabled = !ready;

    if (ready) {
      btn.classList.add('ready');
    } else {
      btn.classList.remove('ready');
    }
  }

  /* =========================
     RESULTADOS Y DESCARGA
     ========================= */

  /**
   * Muestra el área de resultados con opciones de descarga
   * @param {Object} result - Datos del documento generado
   */
  function showResult(result) {
    const resultArea = document.getElementById('result-area');
    if (!resultArea) return;

    resultArea.classList.remove('hidden');
    resultArea.innerHTML = `
      <div class="result-card">
        <svg class="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <h3 class="result-title">¡Documento Generado!</h3>
        <p class="result-subtitle">Tu documento está listo para descargar</p>
        <div class="download-buttons">
          <button class="download-btn download-btn-docx" id="download-docx">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Descargar Word (.docx)
          </button>
          <button class="download-btn download-btn-pdf" id="download-pdf">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Descargar PDF
          </button>
        </div>
        <button class="btn btn-ghost mt-3" id="new-document-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Generar otro documento
        </button>
      </div>
    `;

    // Re-vincular eventos de descarga
    const downloadDocx = document.getElementById('download-docx');
    const downloadPdf = document.getElementById('download-pdf');
    const newDocBtn = document.getElementById('new-document-btn');

    if (downloadDocx) downloadDocx.addEventListener('click', () => handleDownload('docx'));
    if (downloadPdf) downloadPdf.addEventListener('click', () => handleDownload('pdf'));
    if (newDocBtn) newDocBtn.addEventListener('click', resetAll);

    // Scroll suave hacia el resultado
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Maneja la descarga del documento en el formato especificado
   * @param {string} format - 'docx' o 'pdf'
   */
  async function handleDownload(format) {
    if (!generatedDocId) {
      App.showToast('No hay documento disponible para descargar', 'error');
      return;
    }

    try {
      App.showToast('Preparando descarga...', 'info', 2000);
      const blob = await API.document.download(generatedDocId, format);

      // Crear enlace de descarga temporal
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Nombre del archivo
      const templateName = templateFile ? templateFile.name.replace(/\.[^.]+$/, '') : 'documento';
      a.download = `${templateName}_generado.${format}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      App.showToast(`Archivo .${format} descargado correctamente`, 'success');
    } catch (error) {
      console.error('Error descargando:', error);
      App.showToast(error.message || 'Error al descargar el documento', 'error');
    }
  }

  /* =========================
     RESETEO
     ========================= */

  /**
   * Resetea toda la herramienta al estado inicial
   */
  function resetAll() {
    // Limpiar estado
    templateFile = null;
    contentFile = null;
    templateUploadId = null;
    contentUploadId = null;
    generatedDocId = null;
    currentTab = 'file';

    // Restaurar zonas
    restoreZone('template');
    restoreZone('content');

    // Limpiar textarea
    const textarea = document.getElementById('content-textarea');
    if (textarea) textarea.value = '';

    const counter = document.getElementById('text-counter');
    if (counter) counter.textContent = '0 caracteres';

    // Resetear inputs
    const templateInput = document.getElementById('template-input');
    const contentInput = document.getElementById('content-input');
    if (templateInput) templateInput.value = '';
    if (contentInput) contentInput.value = '';

    // Resetear tabs
    switchTab('file');

    // Ocultar resultados
    const resultArea = document.getElementById('result-area');
    if (resultArea) {
      resultArea.classList.add('hidden');
      resultArea.innerHTML = '';
    }

    // Actualizar botón
    updateGenerateButton();

    // Scroll al inicio de la herramienta
    const toolSection = document.getElementById('tool-section');
    if (toolSection) {
      toolSection.scrollIntoView({ behavior: 'smooth' });
    }

    App.showToast('Herramienta reiniciada', 'info', 2000);
  }

  /* =========================
     UTILIDADES DE ICONOS DE ARCHIVO
     ========================= */

  /**
   * Obtiene la clase CSS para el icono según la extensión
   * @param {string} ext - Extensión del archivo
   * @returns {string} Clase CSS
   */
  function getFileIconClass(ext) {
    const map = {
      docx: 'docx', doc: 'docx',
      pdf: 'pdf',
      txt: 'txt',
      json: 'json', md: 'txt',
      jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image'
    };
    return map[ext.toLowerCase()] || 'default';
  }

  /**
   * Obtiene el SVG del icono según la extensión
   * @param {string} ext - Extensión del archivo
   * @returns {string} Código SVG
   */
  function getFileIconSvg(ext) {
    const icons = {
      docx: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      pdf: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      txt: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      json: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      image: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
    };
    return icons[ext.toLowerCase()] || icons.txt;
  }

  /* =========================
     API PÚBLICA
     ========================= */
  return {
    init,
    resetAll,
    handleDownload
  };
})();

// Inicializar cuando el DOM esté listo (si estamos en la página correcta)
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'home') {
    Upload.init();
  }
});
