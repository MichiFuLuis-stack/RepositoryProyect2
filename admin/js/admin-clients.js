document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('clients-table-body');
  const searchInput = document.getElementById('search-clients');
  
  let clientsData = [];

  async function loadClients() {
    try {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Cargando...</td></tr>`;
      
      const response = await AdminAPI.database.getTableData('clients');
      if (response && response.success) {
        clientsData = response.data.rows || [];
        renderClients(clientsData);
      } else {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Error al cargar clientes</td></tr>`;
      }
    } catch (error) {
      console.error(error);
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Error de conexión</td></tr>`;
    }
  }

  function renderClients(data) {
    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No se encontraron clientes</td></tr>`;
      return;
    }

    let html = '';
    data.forEach(client => {
      const isPremium = client.membership === 'premium';
      const badgeClass = isPremium ? 'badge-premium' : 'badge-free';
      const badgeText = isPremium ? 'Premium' : 'Gratis';
      
      html += `
        <tr>
          <td>${client.id}</td>
          <td><strong>${client.name || 'Sin nombre'}</strong><br><span style="font-size: 0.85em; color: #6b7280;">${client.email}</span></td>
          <td><span class="${badgeClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; background: ${isPremium ? '#10b98120' : '#6b728020'}; color: ${isPremium ? '#10b981' : '#6b7280'};">${badgeText}</span></td>
          <td>${client.created_at ? client.created_at.split(' ')[0] : '-'}</td>
          <td>
            <button class="btn-delete" data-id="${client.id}" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 5px 10px; border-radius: 6px; cursor: pointer;">
              Eliminar
            </button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;

    // Add event listeners to delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`¿Estás seguro de que deseas eliminar al cliente con ID ${id}? Esta acción es irreversible.`)) {
          try {
            const res = await AdminAPI.database.deleteRecord('clients', id);
            if (res && res.success) {
              alert('Cliente eliminado');
              loadClients();
            } else {
              alert(res?.message || 'Error al eliminar cliente');
            }
          } catch (err) {
            alert(err.message || 'Error al eliminar cliente');
          }
        }
      });
    });
  }

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = clientsData.filter(c => 
      (c.name && c.name.toLowerCase().includes(term)) || 
      (c.email && c.email.toLowerCase().includes(term))
    );
    renderClients(filtered);
  });

  loadClients();
});
