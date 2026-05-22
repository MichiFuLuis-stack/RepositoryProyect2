document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('files-table-body');
  const searchInput = document.getElementById('search-files');
  const filterType = document.getElementById('filter-type');
  
  let filesData = [];

  async function loadFiles() {
    try {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Cargando...</td></tr>`;
      
      const uploadedRes = await AdminAPI.database.getTableData('uploaded_files');
      const generatedRes = await AdminAPI.database.getTableData('generated_files');
      
      let uploaded = [];
      let generated = [];

      if (uploadedRes && uploadedRes.success) {
        uploaded = uploadedRes.data.rows.map(f => ({...f, source: 'uploaded_files', category: 'Subido'}));
      }
      
      if (generatedRes && generatedRes.success) {
        generated = generatedRes.data.rows.map(f => ({...f, source: 'generated_files', category: 'Generado'}));
      }

      filesData = [...uploaded, ...generated].sort((a, b) => new Date(b.created_at || b.uploaded_at || b.generated_at) - new Date(a.created_at || a.uploaded_at || a.generated_at));
      
      renderFiles(filesData);
    } catch (error) {
      console.error(error);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error de conexión</td></tr>`;
    }
  }

  function renderFiles(data) {
    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No se encontraron archivos</td></tr>`;
      return;
    }

    let html = '';
    data.forEach(file => {
      const isSubido = file.category === 'Subido';
      const badgeClass = isSubido ? 'badge-primary' : 'badge-success';
      const dateStr = file.created_at || file.uploaded_at || file.generated_at || '-';
      const sizeKB = file.file_size ? (file.file_size / 1024).toFixed(1) + ' KB' : '-';
      
      html += `
        <tr>
          <td>${file.id}</td>
          <td><strong>${file.original_name || 'Sin nombre'}</strong></td>
          <td><span class="${badgeClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; background: ${isSubido ? '#3b82f620' : '#10b98120'}; color: ${isSubido ? '#3b82f6' : '#10b981'};">${file.category}</span></td>
          <td>${sizeKB}</td>
          <td>${dateStr.split(' ')[0]}</td>
          <td>
            <button class="btn-delete" data-id="${file.id}" data-source="${file.source}" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 5px 10px; border-radius: 6px; cursor: pointer;">
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
        const source = e.target.getAttribute('data-source');
        if (confirm(`¿Estás seguro de que deseas eliminar este archivo (ID ${id})? Esta acción es irreversible.`)) {
          try {
            const res = await AdminAPI.database.deleteRecord(source, id);
            if (res && res.success) {
              alert('Archivo eliminado');
              loadFiles();
            } else {
              alert(res?.message || 'Error al eliminar archivo');
            }
          } catch (err) {
            alert(err.message || 'Error al eliminar archivo');
          }
        }
      });
    });
  }

  function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const type = filterType.value;
    
    const filtered = filesData.filter(f => {
      const matchSearch = (f.original_name && f.original_name.toLowerCase().includes(term));
      const matchType = type === 'all' || (type === 'uploaded' && f.category === 'Subido') || (type === 'generated' && f.category === 'Generado');
      return matchSearch && matchType;
    });
    renderFiles(filtered);
  }

  searchInput.addEventListener('input', applyFilters);
  filterType.addEventListener('change', applyFilters);

  loadFiles();
});
