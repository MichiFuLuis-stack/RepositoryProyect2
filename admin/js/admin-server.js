document.addEventListener('DOMContentLoaded', () => {
  const cpuUsage = document.getElementById('cpu-usage');
  const memoryUsage = document.getElementById('memory-usage');
  const uptime = document.getElementById('uptime');
  const platform = document.getElementById('platform');
  const nodeVersion = document.getElementById('node-version');
  
  async function loadServerStats() {
    try {
      const response = await AdminAPI.server.getStats();
      if (response && response.success) {
        const stats = response.stats;
        
        cpuUsage.textContent = `${stats.cpuUsage}%`;
        
        const memoryUsedMB = Math.round(stats.memoryUsed / 1024 / 1024);
        const memoryTotalMB = Math.round(stats.memoryTotal / 1024 / 1024);
        memoryUsage.textContent = `${memoryUsedMB} MB / ${memoryTotalMB} MB`;
        
        const uptimeHours = Math.floor(stats.uptime / 3600);
        const uptimeMinutes = Math.floor((stats.uptime % 3600) / 60);
        uptime.textContent = `${uptimeHours}h ${uptimeMinutes}m`;
        
        platform.textContent = stats.platform;
        nodeVersion.textContent = stats.nodeVersion;
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Cargar al inicio
  loadServerStats();
  
  // Actualizar cada 5 segundos
  setInterval(loadServerStats, 5000);
});
