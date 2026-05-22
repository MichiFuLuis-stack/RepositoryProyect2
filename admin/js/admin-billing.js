document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('billing-table-body');
  const searchInput = document.getElementById('search-billing');
  
  let invoicesData = [];

  async function loadInvoices() {
    try {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Cargando...</td></tr>`;
      
      const response = await AdminAPI.database.getTableData('invoices');
      if (response && response.success) {
        invoicesData = response.data.rows || [];
        renderInvoices(invoicesData);
      } else {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error al cargar facturación</td></tr>`;
      }
    } catch (error) {
      console.error(error);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error de conexión</td></tr>`;
    }
  }

  function renderInvoices(data) {
    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No se encontraron facturas</td></tr>`;
      return;
    }

    let html = '';
    let totalRevenue = 0;
    
    data.forEach(invoice => {
      const isCompleted = invoice.status === 'completed';
      const badgeClass = isCompleted ? 'badge-success' : 'badge-warning';
      const statusText = isCompleted ? 'Completado' : 'Pendiente';
      
      if (isCompleted) {
        totalRevenue += invoice.amount || 0;
      }
      
      html += `
        <tr>
          <td>${invoice.id}</td>
          <td><strong>${invoice.invoice_number || 'INV-000'}</strong></td>
          <td>Client ID: ${invoice.client_id}</td>
          <td>$${(invoice.amount || 0).toFixed(2)}</td>
          <td><span class="${badgeClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; background: ${isCompleted ? '#10b98120' : '#f59e0b20'}; color: ${isCompleted ? '#10b981' : '#f59e0b'};">${statusText}</span></td>
          <td>${invoice.created_at ? invoice.created_at.split(' ')[0] : '-'}</td>
          <td>
            <button class="btn-delete" data-id="${invoice.id}" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 5px 10px; border-radius: 6px; cursor: pointer;">
              Eliminar
            </button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
    
    // Update revenue stat if element exists
    const revenueStat = document.getElementById('total-revenue');
    if (revenueStat) {
      revenueStat.textContent = `$${totalRevenue.toFixed(2)}`;
    }

    // Add event listeners to delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`¿Estás seguro de que deseas eliminar la factura ID ${id}? Esta acción es irreversible.`)) {
          try {
            const res = await AdminAPI.database.deleteRecord('invoices', id);
            if (res && res.success) {
              alert('Factura eliminada');
              loadInvoices();
            } else {
              alert(res?.message || 'Error al eliminar factura');
            }
          } catch (err) {
            alert(err.message || 'Error al eliminar factura');
          }
        }
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = invoicesData.filter(i => 
        (i.invoice_number && i.invoice_number.toLowerCase().includes(term)) || 
        (i.status && i.status.toLowerCase().includes(term))
      );
      renderInvoices(filtered);
    });
  }

  loadInvoices();
});
