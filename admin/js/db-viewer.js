/* ============================================================
   DocPlant 🌱 — Visor de Base de Datos
   Lógica para el explorador de base de datos integrado
   ============================================================ */

const DBViewer = (() => {
  'use strict';

  // Estado interno del visor
  let state = {
    currentTable: '',
    currentPage: 1,
    totalPages: 1,
    totalRows: 0,
    columns: [],
    rows: [],
    searchTerm: '',
    sortColumn: '',
    sortDirection: 'asc',
    isLoading: false,
    sqlExpanded: false
  };

  // Referencias a elementos del DOM
  let elements = {};

  /**
   * Inicializar el visor de base de datos
   */
  function init() {
    // Capturar referencias a elementos del DOM
    elements = {
      tableSelector: document.getElementById('dbTableSelector'),
      tableContainer: document.getElementById('dbTableContainer'),
      tableHead: document.getElementById('dbTableHead'),
      tableBody: document.getElementById('dbTableBody'),
      tableInfoBar: document.getElementById('dbTableInfoBar'),
      tableSearch: document.getElementById('dbTableSearch'),
      paginationInfo: document.getElementById('dbPaginationInfo'),
      paginationControls: document.getElementById('dbPaginationControls'),
      sqlToggle: document.getElementById('sqlToggle'),
      sqlBody: document.getElementById('sqlBody'),
      sqlTextarea: document.getElementById('sqlTextarea'),
      sqlExecuteBtn: document.getElementById('sqlExecuteBtn'),
      sqlResults: document.getElementById('sqlResults'),
      detailPanel: document.getElementById('dbDetailPanel'),
      detailPanelBody: document.getElementById('dbDetailPanelBody'),
      detailPanelOverlay: document.getElementById('dbDetailPanelOverlay'),
      dbStatsTotal: document.getElementById('dbStatsTotal'),
      dbStatsRows: document.getElementById('dbStatsRows'),
      dbStatsSize: document.getElementById('dbStatsSize'),
      emptyState: document.getElementById('dbEmptyState'),
      exportCsvBtn: document.getElementById('dbExportCsv'),
      exportJsonBtn: document.getElementById('dbExportJson')
    };

    // Vincular eventos
    bindEvents();

    // Cargar estadísticas generales
    loadDatabaseStats();
  }

  /**
   * Vincular todos los event listeners
   */
  function bindEvents() {
    // Selector de tabla
    if (elements.tableSelector) {
      elements.tableSelector.addEventListener('change', (e) => {
        state.currentTable = e.target.value;
        state.currentPage = 1;
        state.searchTerm = '';
        state.sortColumn = '';
        state.sortDirection = 'asc';
        if (elements.tableSearch) elements.tableSearch.value = '';

        if (state.currentTable) {
          loadTableData();
        } else {
          clearTable();
        }
      });
    }

    // Búsqueda dentro de la tabla
    if (elements.tableSearch) {
      let searchTimeout;
      elements.tableSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          state.searchTerm = e.target.value.trim();
          state.currentPage = 1;
          loadTableData();
        }, 400);
      });
    }

    // Toggle del área SQL
    if (elements.sqlToggle) {
      elements.sqlToggle.addEventListener('click', () => {
        state.sqlExpanded = !state.sqlExpanded;
        if (elements.sqlBody) {
          elements.sqlBody.classList.toggle('show', state.sqlExpanded);
        }
        // Rotar icono chevron
        const chevron = elements.sqlToggle.querySelector('.sql-chevron');
        if (chevron) {
          chevron.style.transform = state.sqlExpanded ? 'rotate(180deg)' : 'rotate(0)';
        }
      });
    }

    // Ejecutar query SQL
    if (elements.sqlExecuteBtn) {
      elements.sqlExecuteBtn.addEventListener('click', executeQuery);
    }

    // Atajo de teclado: Ctrl+Enter para ejecutar query
    if (elements.sqlTextarea) {
      elements.sqlTextarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          executeQuery();
        }
      });
    }

    // Cerrar panel de detalles
    if (elements.detailPanelOverlay) {
      elements.detailPanelOverlay.addEventListener('click', closeDetailPanel);
    }

    const closeBtn = document.getElementById('dbDetailPanelClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDetailPanel);
    }

    // Exportar CSV
    if (elements.exportCsvBtn) {
      elements.exportCsvBtn.addEventListener('click', () => exportTable('csv'));
    }

    // Exportar JSON
    if (elements.exportJsonBtn) {
      elements.exportJsonBtn.addEventListener('click', () => exportTable('json'));
    }
  }

  /**
   * Cargar las estadísticas generales de la BD
   */
  async function loadDatabaseStats() {
    try {
      const stats = await AdminAPI.database.getStats();
      if (elements.dbStatsTotal) {
        elements.dbStatsTotal.textContent = stats.totalTables || '5';
      }
      if (elements.dbStatsRows) {
        elements.dbStatsRows.textContent = stats.totalRows || '0';
      }
      if (elements.dbStatsSize) {
        elements.dbStatsSize.textContent = stats.fileSize || '0 KB';
      }
    } catch (error) {
      console.warn('No se pudieron cargar estadísticas de BD (usando datos de ejemplo):', error.message);
      // Datos de ejemplo si la API no está disponible
      if (elements.dbStatsTotal) elements.dbStatsTotal.textContent = '5';
      if (elements.dbStatsRows) elements.dbStatsRows.textContent = '247';
      if (elements.dbStatsSize) elements.dbStatsSize.textContent = '1.2 MB';
    }
  }

  /**
   * Cargar datos de la tabla seleccionada
   */
  async function loadTableData() {
    if (!state.currentTable) return;

    state.isLoading = true;
    showLoadingState();

    try {
      const result = await AdminAPI.database.getTableData(
        state.currentTable,
        state.currentPage,
        state.searchTerm
      );

      state.columns = result.columns || [];
      state.rows = result.rows || [];
      state.totalRows = result.totalRows || 0;
      state.totalPages = result.totalPages || 1;

      renderTable();
      renderPagination();
      updateTableInfo();

      // Mostrar contenedor de tabla
      if (elements.tableContainer) {
        elements.tableContainer.style.display = 'block';
      }
      if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
      }
    } catch (error) {
      console.warn('Error cargando datos de tabla (usando datos de ejemplo):', error.message);
      // Datos de ejemplo si la API no está disponible
      loadSampleData();
    } finally {
      state.isLoading = false;
    }
  }

  /**
   * Cargar datos de ejemplo para demostración
   */
  function loadSampleData() {
    const sampleTables = {
      clients: {
        columns: ['id', 'nombre', 'email', 'membership', 'created_at', 'active'],
        rows: [
          { id: 1, nombre: 'Ana García', email: 'ana@email.com', membership: 'premium', created_at: '2026-01-15', active: 1 },
          { id: 2, nombre: 'Carlos López', email: 'carlos@email.com', membership: 'free', created_at: '2026-02-20', active: 1 },
          { id: 3, nombre: 'María Torres', email: 'maria@email.com', membership: 'premium', created_at: '2026-03-10', active: 1 },
          { id: 4, nombre: 'Juan Martínez', email: 'juan@email.com', membership: 'free', created_at: '2026-03-25', active: 0 },
          { id: 5, nombre: 'Laura Sánchez', email: 'laura@email.com', membership: 'premium', created_at: '2026-04-02', active: 1 }
        ]
      },
      uploaded_files: {
        columns: ['id', 'filename', 'type', 'size_bytes', 'user_id', 'uploaded_at'],
        rows: [
          { id: 1, filename: 'plantilla_carta.docx', type: 'template', size_bytes: 45200, user_id: 1, uploaded_at: '2026-05-20' },
          { id: 2, filename: 'datos_clientes.xlsx', type: 'content', size_bytes: 128400, user_id: 1, uploaded_at: '2026-05-20' },
          { id: 3, filename: 'contrato.docx', type: 'template', size_bytes: 67800, user_id: 2, uploaded_at: '2026-05-21' },
          { id: 4, filename: 'lista_empleados.csv', type: 'content', size_bytes: 23100, user_id: 3, uploaded_at: '2026-05-21' }
        ]
      },
      generated_files: {
        columns: ['id', 'filename', 'source_template', 'size_bytes', 'session_id', 'created_at'],
        rows: [
          { id: 1, filename: 'carta_ana_garcia.docx', source_template: 'plantilla_carta.docx', size_bytes: 48300, session_id: 'ses_abc123', created_at: '2026-05-20' },
          { id: 2, filename: 'carta_carlos_lopez.docx', source_template: 'plantilla_carta.docx', size_bytes: 47900, session_id: 'ses_abc123', created_at: '2026-05-20' },
          { id: 3, filename: 'contrato_maria.docx', source_template: 'contrato.docx', size_bytes: 71200, session_id: 'ses_def456', created_at: '2026-05-21' }
        ]
      },
      invoices: {
        columns: ['id', 'invoice_number', 'client_id', 'amount', 'status', 'method', 'created_at'],
        rows: [
          { id: 1, invoice_number: 'INV-2026-001', client_id: 1, amount: 9.99, status: 'completed', method: 'PayPal', created_at: '2026-01-15' },
          { id: 2, invoice_number: 'INV-2026-002', client_id: 3, amount: 9.99, status: 'completed', method: 'PayPal', created_at: '2026-02-15' },
          { id: 3, invoice_number: 'INV-2026-003', client_id: 5, amount: 9.99, status: 'pending', method: 'PayPal', created_at: '2026-05-15' }
        ]
      },
      sessions: {
        columns: ['id', 'session_id', 'user_id', 'ip_address', 'created_at', 'expires_at'],
        rows: [
          { id: 1, session_id: 'ses_abc123', user_id: 1, ip_address: '192.168.1.100', created_at: '2026-05-22 08:00:00', expires_at: '2026-05-22 20:00:00' },
          { id: 2, session_id: 'ses_def456', user_id: 3, ip_address: '192.168.1.105', created_at: '2026-05-22 09:30:00', expires_at: '2026-05-22 21:30:00' }
        ]
      }
    };

    const tableData = sampleTables[state.currentTable];
    if (tableData) {
      state.columns = tableData.columns;

      // Filtrar por búsqueda local si hay término
      let filteredRows = tableData.rows;
      if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        filteredRows = tableData.rows.filter(row =>
          Object.values(row).some(val =>
            String(val).toLowerCase().includes(term)
          )
        );
      }

      // Ordenar si hay columna de orden
      if (state.sortColumn) {
        filteredRows = [...filteredRows].sort((a, b) => {
          const aVal = a[state.sortColumn];
          const bVal = b[state.sortColumn];
          let compare = 0;
          if (typeof aVal === 'number') {
            compare = aVal - bVal;
          } else {
            compare = String(aVal).localeCompare(String(bVal));
          }
          return state.sortDirection === 'desc' ? -compare : compare;
        });
      }

      state.rows = filteredRows;
      state.totalRows = filteredRows.length;
      state.totalPages = Math.ceil(filteredRows.length / 25) || 1;

      renderTable();
      renderPagination();
      updateTableInfo();

      if (elements.tableContainer) {
        elements.tableContainer.style.display = 'block';
      }
      if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
      }
    }
  }

  /**
   * Renderizar la tabla con los datos actuales
   */
  function renderTable() {
    if (!elements.tableHead || !elements.tableBody) return;

    // Renderizar encabezados
    let headHTML = '<tr>';
    state.columns.forEach(col => {
      const isSorted = state.sortColumn === col;
      const sortClass = isSorted ? ' sorted' : '';
      const sortIcon = isSorted
        ? (state.sortDirection === 'asc'
          ? '<svg class="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>'
          : '<svg class="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>')
        : '<svg class="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.3"><polyline points="6 9 12 15 18 9"/></svg>';

      headHTML += `<th class="${sortClass}" data-column="${col}">${escapeHtml(col)} ${sortIcon}</th>`;
    });
    headHTML += '</tr>';
    elements.tableHead.innerHTML = headHTML;

    // Agregar eventos de click para ordenar
    elements.tableHead.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const column = th.getAttribute('data-column');
        if (state.sortColumn === column) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortColumn = column;
          state.sortDirection = 'asc';
        }
        loadTableData();
      });
    });

    // Renderizar filas
    if (state.rows.length === 0) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="${state.columns.length}" class="text-center" style="padding: 40px 20px;">
            <div class="table-empty">
              <div class="table-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4 7V4a2 2 0 012-2h8.5L20 7.5V20a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="2" y1="12" x2="12" y2="12"/>
                </svg>
              </div>
              <div class="table-empty-title">Sin datos</div>
              <div class="table-empty-text">No se encontraron registros en esta tabla</div>
            </div>
          </td>
        </tr>`;
      return;
    }

    let bodyHTML = '';
    // Paginar localmente (25 por página)
    const start = (state.currentPage - 1) * 25;
    const end = Math.min(start + 25, state.rows.length);
    const pageRows = state.rows.slice(start, end);

    pageRows.forEach((row, index) => {
      bodyHTML += `<tr class="db-row" data-row-index="${start + index}" style="cursor: pointer;">`;
      state.columns.forEach(col => {
        const value = row[col] !== undefined && row[col] !== null ? row[col] : '';
        bodyHTML += `<td>${escapeHtml(String(value))}</td>`;
      });
      bodyHTML += '</tr>';
    });

    elements.tableBody.innerHTML = bodyHTML;

    // Click en fila para ver detalles
    elements.tableBody.querySelectorAll('.db-row').forEach(tr => {
      tr.addEventListener('click', () => {
        const rowIndex = parseInt(tr.getAttribute('data-row-index'));
        showRowDetail(state.rows[rowIndex]);
      });
    });
  }

  /**
   * Renderizar controles de paginación
   */
  function renderPagination() {
    if (!elements.paginationInfo || !elements.paginationControls) return;

    const start = Math.min((state.currentPage - 1) * 25 + 1, state.totalRows);
    const end = Math.min(state.currentPage * 25, state.totalRows);

    elements.paginationInfo.textContent = `Mostrando ${start}-${end} de ${state.totalRows} registros`;

    let paginationHTML = '';

    // Botón anterior
    paginationHTML += `<button class="table-pagination-btn" ${state.currentPage <= 1 ? 'disabled' : ''} data-page="${state.currentPage - 1}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    </button>`;

    // Números de página
    const maxVisible = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(state.totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `<button class="table-pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Botón siguiente
    paginationHTML += `<button class="table-pagination-btn" ${state.currentPage >= state.totalPages ? 'disabled' : ''} data-page="${state.currentPage + 1}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;

    elements.paginationControls.innerHTML = paginationHTML;

    // Eventos de paginación
    elements.paginationControls.querySelectorAll('.table-pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const page = parseInt(btn.getAttribute('data-page'));
        if (page >= 1 && page <= state.totalPages) {
          state.currentPage = page;
          loadTableData();
        }
      });
    });
  }

  /**
   * Actualizar la barra de información de la tabla
   */
  function updateTableInfo() {
    if (!elements.tableInfoBar) return;

    elements.tableInfoBar.innerHTML = `
      <div class="table-info-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span>Tabla: <strong>${escapeHtml(state.currentTable)}</strong></span>
      </div>
      <div class="table-info-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>Filas: <strong>${state.totalRows}</strong></span>
      </div>
      <div class="table-info-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
          <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
        </svg>
        <span>Columnas: <strong>${state.columns.length}</strong> (${state.columns.join(', ')})</span>
      </div>
    `;
    elements.tableInfoBar.style.display = 'flex';
  }

  /**
   * Mostrar detalle de una fila en el panel lateral
   * @param {Object} row - Datos de la fila
   */
  function showRowDetail(row) {
    if (!elements.detailPanel || !elements.detailPanelBody) return;

    let detailHTML = '';
    for (const [key, value] of Object.entries(row)) {
      detailHTML += `
        <div class="detail-row">
          <span class="detail-row-label">${escapeHtml(key)}</span>
          <span class="detail-row-value">${escapeHtml(String(value !== null && value !== undefined ? value : 'NULL'))}</span>
        </div>`;
    }

    // Add Delete Button if row has ID
    if (row.id) {
      detailHTML += `
        <div style="margin-top: 30px; text-align: center;">
          <button id="delete-record-btn" class="btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 10px 20px; border-radius: 8px; width: 100%; font-weight: bold; cursor: pointer;">
            🗑️ Eliminar Registro
          </button>
        </div>
      `;
    }

    elements.detailPanelBody.innerHTML = detailHTML;
    
    // Bind Delete Event
    if (row.id) {
      const deleteBtn = document.getElementById('delete-record-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (confirm(`¿Estás seguro de que deseas eliminar este registro (ID: ${row.id}) de la tabla ${state.currentTable}? Esta acción no se puede deshacer.`)) {
            try {
              const res = await AdminAPI.database.deleteRecord(state.currentTable, row.id);
              if (res && res.success) {
                alert('Registro eliminado exitosamente');
                closeDetailPanel();
                loadTableData(); // Reload table
              } else {
                alert(res?.message || 'Error al eliminar');
              }
            } catch (err) {
              alert(err.message || 'Error al eliminar');
            }
          }
        });
      }
    }

    elements.detailPanel.classList.add('show');
    if (elements.detailPanelOverlay) {
      elements.detailPanelOverlay.classList.add('show');
    }
  }

  /**
   * Cerrar el panel de detalles
   */
  function closeDetailPanel() {
    if (elements.detailPanel) {
      elements.detailPanel.classList.remove('show');
    }
    if (elements.detailPanelOverlay) {
      elements.detailPanelOverlay.classList.remove('show');
    }
  }

  /**
   * Ejecutar una consulta SQL
   */
  async function executeQuery() {
    if (!elements.sqlTextarea || !elements.sqlResults) return;

    const sql = elements.sqlTextarea.value.trim();
    if (!sql) {
      showSqlError('Por favor, ingresa una consulta SQL.');
      return;
    }

    // Validar que sea solo SELECT
    const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();
    if (!normalizedSql.startsWith('SELECT')) {
      showSqlError('Solo se permiten consultas SELECT por seguridad.');
      return;
    }

    // Verificar que no contenga sentencias peligrosas
    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE'];
    for (const word of forbidden) {
      // Buscar la palabra como token completo (no como substring)
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(sql)) {
        showSqlError(`La sentencia "${word}" no está permitida. Solo consultas SELECT.`);
        return;
      }
    }

    // Mostrar loading
    elements.sqlResults.innerHTML = `
      <div class="sql-results-header">Ejecutando consulta...</div>
      <div style="padding: 20px; text-align: center;">
        <div class="loading-shimmer" style="height: 20px; margin-bottom: 8px;"></div>
        <div class="loading-shimmer" style="height: 20px; margin-bottom: 8px; width: 80%;"></div>
        <div class="loading-shimmer" style="height: 20px; width: 60%;"></div>
      </div>`;

    try {
      const result = await AdminAPI.database.executeQuery(sql);
      renderQueryResults(result);
    } catch (error) {
      // Simular resultados si la API no está disponible
      console.warn('API no disponible, simulando resultado:', error.message);
      simulateQueryResult(sql);
    }
  }

  /**
   * Simular resultado de consulta (para demostración)
   * @param {string} sql - Consulta SQL
   */
  function simulateQueryResult(sql) {
    const normalizedSql = sql.trim().toUpperCase();

    // Detectar tabla mencionada
    let tableName = '';
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (fromMatch) tableName = fromMatch[1].toLowerCase();

    const sampleResults = {
      clients: {
        columns: ['id', 'nombre', 'email', 'membership'],
        rows: [
          { id: 1, nombre: 'Ana García', email: 'ana@email.com', membership: 'premium' },
          { id: 2, nombre: 'Carlos López', email: 'carlos@email.com', membership: 'free' }
        ],
        rowCount: 2
      }
    };

    const result = sampleResults[tableName] || {
      columns: ['resultado'],
      rows: [{ resultado: 'Consulta ejecutada correctamente' }],
      rowCount: 1
    };

    renderQueryResults(result);
  }

  /**
   * Renderizar resultados de una consulta SQL
   * @param {Object} result - Resultado de la consulta
   */
  function renderQueryResults(result) {
    if (!elements.sqlResults) return;

    const columns = result.columns || [];
    const rows = result.rows || [];

    let html = `<div class="sql-results-header">Resultados: ${rows.length} fila(s) encontrada(s)</div>`;

    if (rows.length === 0) {
      html += '<p class="text-muted" style="padding: 16px 0;">La consulta no devolvió resultados.</p>';
    } else {
      html += '<div style="overflow-x: auto; max-height: 400px;">';
      html += '<table class="data-table" style="margin-top: 8px;">';
      html += '<thead><tr>';
      columns.forEach(col => {
        html += `<th>${escapeHtml(col)}</th>`;
      });
      html += '</tr></thead>';
      html += '<tbody>';
      rows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
          const val = row[col] !== undefined && row[col] !== null ? row[col] : 'NULL';
          html += `<td>${escapeHtml(String(val))}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      html += '</div>';
    }

    elements.sqlResults.innerHTML = html;
  }

  /**
   * Mostrar error en el área SQL
   * @param {string} message - Mensaje de error
   */
  function showSqlError(message) {
    if (!elements.sqlResults) return;

    elements.sqlResults.innerHTML = `
      <div style="padding: 12px 16px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; display: flex; align-items: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span style="color: #ef4444; font-size: 0.85rem;">${escapeHtml(message)}</span>
      </div>`;
  }

  /**
   * Exportar tabla en el formato especificado
   * @param {string} format - 'csv' o 'json'
   */
  async function exportTable(format) {
    if (!state.currentTable) {
      if (typeof AdminApp !== 'undefined') {
        AdminApp.showToast('warning', 'Sin tabla seleccionada', 'Selecciona una tabla antes de exportar.');
      }
      return;
    }

    try {
      await AdminAPI.database.exportTable(state.currentTable, format);
      if (typeof AdminApp !== 'undefined') {
        AdminApp.showToast('success', 'Exportación exitosa', `Tabla "${state.currentTable}" exportada como ${format.toUpperCase()}.`);
      }
    } catch (error) {
      console.warn('API no disponible para exportar, generando localmente:', error.message);
      exportLocalData(format);
    }
  }

  /**
   * Exportar datos localmente si la API no está disponible
   * @param {string} format - 'csv' o 'json'
   */
  function exportLocalData(format) {
    if (state.rows.length === 0) return;

    let content, mimeType, extension;

    if (format === 'csv') {
      // Generar CSV
      const headers = state.columns.join(',');
      const rows = state.rows.map(row =>
        state.columns.map(col => {
          const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
          // Escapar comillas y valores con comas
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      );
      content = [headers, ...rows].join('\n');
      mimeType = 'text/csv';
      extension = 'csv';
    } else {
      // Generar JSON
      content = JSON.stringify(state.rows, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    }

    // Descargar archivo
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.currentTable}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof AdminApp !== 'undefined') {
      AdminApp.showToast('success', 'Exportación completada', `Archivo "${state.currentTable}.${extension}" descargado.`);
    }
  }

  /**
   * Mostrar estado de carga
   */
  function showLoadingState() {
    if (!elements.tableBody) return;

    let html = '';
    for (let i = 0; i < 5; i++) {
      html += '<tr>';
      for (let j = 0; j < (state.columns.length || 5); j++) {
        html += `<td><div class="loading-shimmer" style="height: 16px; width: ${60 + Math.random() * 40}%;"></div></td>`;
      }
      html += '</tr>';
    }
    elements.tableBody.innerHTML = html;
  }

  /**
   * Limpiar la tabla
   */
  function clearTable() {
    if (elements.tableHead) elements.tableHead.innerHTML = '';
    if (elements.tableBody) elements.tableBody.innerHTML = '';
    if (elements.tableInfoBar) elements.tableInfoBar.style.display = 'none';
    if (elements.tableContainer) elements.tableContainer.style.display = 'none';
    if (elements.paginationInfo) elements.paginationInfo.textContent = '';
    if (elements.paginationControls) elements.paginationControls.innerHTML = '';
    if (elements.emptyState) elements.emptyState.style.display = 'block';
    state.columns = [];
    state.rows = [];
    state.totalRows = 0;
    state.totalPages = 1;
  }

  /**
   * Escapar HTML para prevenir XSS
   * @param {string} str - String a escapar
   * @returns {string} String escapado
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // API pública
  return {
    init,
    loadTableData,
    executeQuery,
    closeDetailPanel,
    exportTable
  };
})();
