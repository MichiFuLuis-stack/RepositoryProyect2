// Admin Panel Main Logic
document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Very basic jwt decode to check role
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role !== 'admin') {
      alert('Acceso denegado. No eres administrador.');
      localStorage.removeItem('adminToken');
      window.location.href = 'login.html';
    }
  } catch(e) {
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
  }

  console.log('Admin panel initialized');
  
  // Agregar funcionalidad al botón de cerrar sesión
  const logoutBtn = document.getElementById('logout-btn') || document.querySelector('a[href="#logout"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('adminToken');
      window.location.href = 'login.html';
    });
  }
});

// Simple toast notification system
window.showToast = function(msg, type = 'success') {
  alert(`${type.toUpperCase()}: ${msg}`);
};
