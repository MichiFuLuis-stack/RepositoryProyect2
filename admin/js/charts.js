/* ============================================================
   DocPlant 🌱 — Gráficos y Visualizaciones
   Dibuja gráficos usando Canvas 2D API nativo (sin librerías)
   ============================================================ */

const AdminCharts = (() => {
  'use strict';

  // Paleta de colores del sistema de diseño
  const COLORS = {
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    info: '#06b6d4',
    warning: '#f59e0b',
    error: '#ef4444',
    purple: '#8b5cf6',
    surface: '#111a16',
    surfaceHover: '#1a2820',
    border: 'rgba(16, 185, 129, 0.12)',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    bg: '#0a0f0d'
  };

  // Paleta para series de datos múltiples
  const SERIES_COLORS = [
    '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ];

  /**
   * Configura el canvas para alta resolución (retina)
   * @param {HTMLCanvasElement} canvas - Elemento canvas
   * @returns {CanvasRenderingContext2D} Contexto 2D
   */
  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Dimensiones lógicas
    canvas._logicalWidth = rect.width;
    canvas._logicalHeight = rect.height;

    return ctx;
  }

  /**
   * Dibuja un gráfico de barras con animación
   * @param {HTMLCanvasElement|string} canvasEl - Canvas o ID
   * @param {Object} data - { labels: string[], values: number[], colors?: string[] }
   * @param {Object} options - Configuraciones adicionales
   */
  function drawBarChart(canvasEl, data, options = {}) {
    const canvas = typeof canvasEl === 'string' ? document.getElementById(canvasEl) : canvasEl;
    if (!canvas) return;

    const ctx = setupCanvas(canvas);
    const width = canvas._logicalWidth;
    const height = canvas._logicalHeight;

    const {
      padding = { top: 30, right: 20, bottom: 40, left: 50 },
      barColor = COLORS.primary,
      barRadius = 4,
      showValues = true,
      showGrid = true,
      animate = true,
      title = ''
    } = options;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data.values, 1);
    const barCount = data.labels.length;
    const barGap = chartWidth * 0.15 / barCount;
    const barWidth = (chartWidth - barGap * (barCount + 1)) / barCount;

    // Calcular escala Y
    const ySteps = 5;
    const yStep = Math.ceil(maxVal / ySteps);
    const yMax = yStep * ySteps;

    function render(progress = 1) {
      // Limpiar canvas
      ctx.clearRect(0, 0, width, height);

      // Dibujar título si existe
      if (title) {
        ctx.fillStyle = COLORS.text;
        ctx.font = `600 14px 'Space Grotesk', sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(title, padding.left, 18);
      }

      // Dibujar líneas de la grilla
      if (showGrid) {
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        for (let i = 0; i <= ySteps; i++) {
          const y = padding.top + chartHeight - (i / ySteps) * chartHeight;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();

          // Etiqueta del eje Y
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = `400 11px 'Inter', sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(Math.round(yStep * i).toString(), padding.left - 8, y + 4);
        }
      }

      // Dibujar barras
      data.labels.forEach((label, index) => {
        const x = padding.left + barGap + index * (barWidth + barGap);
        const fullBarHeight = (data.values[index] / yMax) * chartHeight;
        const barHeight = fullBarHeight * progress;
        const y = padding.top + chartHeight - barHeight;

        // Color de la barra
        const color = data.colors ? data.colors[index % data.colors.length] : barColor;

        // Dibujar barra con esquinas redondeadas
        ctx.fillStyle = color;
        if (barHeight > barRadius * 2) {
          ctx.beginPath();
          ctx.moveTo(x, y + barRadius);
          ctx.arcTo(x, y, x + barWidth, y, barRadius);
          ctx.arcTo(x + barWidth, y, x + barWidth, y + barHeight, barRadius);
          ctx.lineTo(x + barWidth, padding.top + chartHeight);
          ctx.lineTo(x, padding.top + chartHeight);
          ctx.closePath();
          ctx.fill();
        } else if (barHeight > 0) {
          ctx.fillRect(x, y, barWidth, barHeight);
        }

        // Valores encima de las barras
        if (showValues && progress >= 0.95) {
          ctx.fillStyle = COLORS.textSecondary;
          ctx.font = `600 11px 'Inter', sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(data.values[index].toString(), x + barWidth / 2, y - 6);
        }

        // Etiquetas del eje X
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = `400 11px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, x + barWidth / 2, padding.top + chartHeight + 20);
      });
    }

    // Animar o dibujar directamente
    if (animate) {
      let startTime = null;
      const duration = 800;

      function animateFrame(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Función de ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        render(eased);
        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        }
      }
      requestAnimationFrame(animateFrame);
    } else {
      render(1);
    }
  }

  /**
   * Dibuja un gráfico de dona/donut con animación
   * @param {HTMLCanvasElement|string} canvasEl - Canvas o ID
   * @param {Object} data - { labels: string[], values: number[], colors?: string[] }
   * @param {Object} options - Configuraciones adicionales
   */
  function drawDoughnutChart(canvasEl, data, options = {}) {
    const canvas = typeof canvasEl === 'string' ? document.getElementById(canvasEl) : canvasEl;
    if (!canvas) return;

    const ctx = setupCanvas(canvas);
    const width = canvas._logicalWidth;
    const height = canvas._logicalHeight;

    const {
      innerRadius = 0.6,
      animate = true,
      showLegend = true,
      showPercentage = true
    } = options;

    const centerX = showLegend ? width * 0.35 : width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX - 10, centerY - 10) * 0.85;
    const innerR = radius * innerRadius;
    const total = data.values.reduce((a, b) => a + b, 0);
    const colors = data.colors || SERIES_COLORS;

    function render(progress = 1) {
      ctx.clearRect(0, 0, width, height);

      let currentAngle = -Math.PI / 2;

      data.values.forEach((val, index) => {
        const sliceAngle = (val / total) * Math.PI * 2 * progress;
        const color = colors[index % colors.length];

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerR, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        currentAngle += sliceAngle;
      });

      // Texto central
      if (showPercentage && progress >= 0.95) {
        ctx.fillStyle = COLORS.text;
        ctx.font = `700 20px 'Space Grotesk', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total.toString(), centerX, centerY - 6);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = `400 11px 'Inter', sans-serif`;
        ctx.fillText('Total', centerX, centerY + 14);
      }

      // Leyenda
      if (showLegend && progress >= 0.9) {
        const legendX = centerX + radius + 30;
        const legendY = (height - data.labels.length * 28) / 2;

        data.labels.forEach((label, index) => {
          const y = legendY + index * 28;
          const color = colors[index % colors.length];
          const pct = total > 0 ? ((data.values[index] / total) * 100).toFixed(1) : '0';

          // Punto de color
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(legendX, y + 8, 5, 0, Math.PI * 2);
          ctx.fill();

          // Texto
          ctx.fillStyle = COLORS.textSecondary;
          ctx.font = `400 12px 'Inter', sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${label} (${pct}%)`, legendX + 14, y + 8);
        });
      }
    }

    if (animate) {
      let startTime = null;
      const duration = 1000;

      function animateFrame(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        render(eased);
        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        }
      }
      requestAnimationFrame(animateFrame);
    } else {
      render(1);
    }
  }

  /**
   * Dibuja un gráfico de líneas con animación
   * @param {HTMLCanvasElement|string} canvasEl - Canvas o ID
   * @param {Object} data - { labels: string[], datasets: [{ values: number[], label: string, color?: string }] }
   * @param {Object} options - Configuraciones adicionales
   */
  function drawLineChart(canvasEl, data, options = {}) {
    const canvas = typeof canvasEl === 'string' ? document.getElementById(canvasEl) : canvasEl;
    if (!canvas) return;

    const ctx = setupCanvas(canvas);
    const width = canvas._logicalWidth;
    const height = canvas._logicalHeight;

    const {
      padding = { top: 30, right: 20, bottom: 40, left: 50 },
      showGrid = true,
      showDots = true,
      showArea = true,
      animate = true,
      smooth = true
    } = options;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calcular max de todos los datasets
    let maxVal = 0;
    const datasets = data.datasets || [{ values: data.values, label: '', color: COLORS.primary }];
    datasets.forEach(ds => {
      const dsMax = Math.max(...ds.values, 0);
      if (dsMax > maxVal) maxVal = dsMax;
    });
    maxVal = maxVal || 1;

    const ySteps = 5;
    const yStep = Math.ceil(maxVal / ySteps);
    const yMax = yStep * ySteps;

    function getPoint(index, value) {
      const x = padding.left + (index / (data.labels.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (value / yMax) * chartHeight;
      return { x, y };
    }

    function render(progress = 1) {
      ctx.clearRect(0, 0, width, height);

      // Grilla
      if (showGrid) {
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        for (let i = 0; i <= ySteps; i++) {
          const y = padding.top + chartHeight - (i / ySteps) * chartHeight;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();

          ctx.fillStyle = COLORS.textMuted;
          ctx.font = `400 11px 'Inter', sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(Math.round(yStep * i).toString(), padding.left - 8, y + 4);
        }
      }

      // Etiquetas del eje X
      data.labels.forEach((label, index) => {
        const pt = getPoint(index, 0);
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = `400 11px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, pt.x, padding.top + chartHeight + 20);
      });

      // Dibujar cada dataset
      datasets.forEach((ds, dsIdx) => {
        const color = ds.color || SERIES_COLORS[dsIdx % SERIES_COLORS.length];
        const pointCount = Math.floor(ds.values.length * progress);
        const partialProgress = (ds.values.length * progress) - pointCount;

        if (pointCount < 1 && progress < 1 / ds.values.length) return;

        // Crear puntos
        const points = [];
        for (let i = 0; i <= Math.min(pointCount, ds.values.length - 1); i++) {
          points.push(getPoint(i, ds.values[i]));
        }

        // Punto parcial para animación suave
        if (pointCount < ds.values.length - 1 && partialProgress > 0) {
          const from = getPoint(pointCount, ds.values[pointCount]);
          const to = getPoint(pointCount + 1, ds.values[pointCount + 1]);
          points.push({
            x: from.x + (to.x - from.x) * partialProgress,
            y: from.y + (to.y - from.y) * partialProgress
          });
        }

        if (points.length < 2) return;

        // Dibujar área bajo la curva
        if (showArea) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, padding.top + chartHeight);
          points.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
          ctx.closePath();

          const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
          gradient.addColorStop(0, color + '30');
          gradient.addColorStop(1, color + '05');
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Dibujar línea
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (smooth && points.length > 2) {
          // Curva suave con bezier
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 0; i < points.length - 1; i++) {
            const cp1x = (points[i].x + points[i + 1].x) / 2;
            const cp1y = points[i].y;
            const cp2x = (points[i].x + points[i + 1].x) / 2;
            const cp2y = points[i + 1].y;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i + 1].x, points[i + 1].y);
          }
        } else {
          points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
        }
        ctx.stroke();

        // Dibujar puntos
        if (showDots && progress >= 0.9) {
          points.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
          });
        }
      });
    }

    if (animate) {
      let startTime = null;
      const duration = 1200;

      function animateFrame(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        render(eased);
        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        }
      }
      requestAnimationFrame(animateFrame);
    } else {
      render(1);
    }
  }

  /**
   * Dibuja un indicador circular (gauge) para métricas del servidor
   * @param {HTMLCanvasElement|string} canvasEl - Canvas o ID
   * @param {number} percentage - Porcentaje (0-100)
   * @param {string} label - Etiqueta central
   * @param {string} color - Color del arco (opcional)
   */
  function drawGauge(canvasEl, percentage, label = '', color = null) {
    const canvas = typeof canvasEl === 'string' ? document.getElementById(canvasEl) : canvasEl;
    if (!canvas) return;

    const ctx = setupCanvas(canvas);
    const width = canvas._logicalWidth;
    const height = canvas._logicalHeight;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 12;
    const lineWidth = 10;

    // Determinar color según porcentaje si no se especifica
    if (!color) {
      if (percentage < 50) color = COLORS.primary;
      else if (percentage < 75) color = COLORS.warning;
      else color = COLORS.error;
    }

    // Ángulos
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const totalAngle = endAngle - startAngle;

    let startTime = null;
    const duration = 800;

    function render(progress) {
      ctx.clearRect(0, 0, width, height);

      const currentPct = percentage * progress;
      const fillAngle = startAngle + (currentPct / 100) * totalAngle;

      // Fondo del arco
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = COLORS.surfaceHover;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arco de progreso
      if (currentPct > 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, fillAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Texto central - porcentaje
      ctx.fillStyle = COLORS.text;
      ctx.font = `700 22px 'Space Grotesk', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(currentPct)}%`, centerX, centerY - 2);

      // Etiqueta
      if (label) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = `400 10px 'Inter', sans-serif`;
        ctx.fillText(label, centerX, centerY + 16);
      }
    }

    function animateFrame(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      render(eased);
      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      }
    }

    requestAnimationFrame(animateFrame);
  }

  // ============================================================
  // Datos de ejemplo para renderizado inicial
  // ============================================================
  const sampleData = {
    weeklyActivity: {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      values: [45, 72, 58, 90, 65, 30, 18],
      colors: ['#10b981', '#10b981', '#10b981', '#10b981', '#10b981', '#10b981', '#10b981']
    },

    storageBreakdown: {
      labels: ['Plantillas', 'Contenido', 'Generados', 'Temporales'],
      values: [120, 85, 200, 45],
      colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b']
    },

    monthlyTrend: {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [
        {
          values: [120, 185, 160, 210, 245, 280],
          label: 'Archivos',
          color: '#10b981'
        },
        {
          values: [80, 95, 110, 130, 145, 175],
          label: 'Usuarios',
          color: '#06b6d4'
        }
      ]
    },

    revenue: {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [
        {
          values: [1200, 1800, 1550, 2100, 2400, 2800],
          label: 'Ingresos',
          color: '#10b981'
        }
      ]
    }
  };

  /**
   * Renderiza los gráficos iniciales del dashboard
   */
  function initDashboardCharts() {
    // Gráfico de actividad semanal (barras)
    const activityCanvas = document.getElementById('activityChart');
    if (activityCanvas) {
      drawBarChart(activityCanvas, sampleData.weeklyActivity, {
        showValues: true,
        barColor: '#10b981'
      });
    }

    // Gráfico de almacenamiento (dona)
    const storageCanvas = document.getElementById('storageChart');
    if (storageCanvas) {
      drawDoughnutChart(storageCanvas, sampleData.storageBreakdown, {
        showLegend: true,
        showPercentage: true
      });
    }

    // Gráfico de tendencia mensual (líneas)
    const trendCanvas = document.getElementById('trendChart');
    if (trendCanvas) {
      drawLineChart(trendCanvas, sampleData.monthlyTrend, {
        showDots: true,
        showArea: true,
        smooth: true
      });
    }
  }

  /**
   * Redimensionar gráficos al cambiar tamaño de ventana
   */
  function handleResize() {
    // Re-dibujar todos los canvas existentes
    const canvases = document.querySelectorAll('.chart-body canvas');
    canvases.forEach(canvas => {
      if (canvas._chartType && canvas._chartData) {
        const drawFn = {
          bar: drawBarChart,
          doughnut: drawDoughnutChart,
          line: drawLineChart,
          gauge: drawGauge
        }[canvas._chartType];

        if (drawFn) {
          drawFn(canvas, canvas._chartData, { ...canvas._chartOptions, animate: false });
        }
      }
    });
  }

  // Listener de resize con debounce
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 250);
  });

  // API pública
  return {
    drawBarChart,
    drawDoughnutChart,
    drawLineChart,
    drawGauge,
    initDashboardCharts,
    sampleData,
    COLORS,
    SERIES_COLORS
  };
})();
