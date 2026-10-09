if (!checkAuth()) throw new Error('Not authenticated');
if (!isAdmin()) { window.location.href = '/gallery.html'; throw new Error('Not admin'); }
initNavbar();

loadStats();
loadUsers();

async function loadStats() {
  try {
    const res = await apiCall('/api/admin/stats');
    document.getElementById('statUsers').textContent = res.data.totalUsers;
    document.getElementById('statImages').textContent = res.data.totalImages;
    document.getElementById('statStorage').textContent = formatFileSize(res.data.totalStorageSize);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadUsers() {
  try {
    const res = await apiCall('/api/admin/users');
    const users = res.data.users;
    document.getElementById('usersTable').innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.email}</td>
        <td><span class="badge bg-${u.role === 'admin' ? 'danger' : 'primary'}">${u.role}</span></td>
        <td>${u.createdAt}</td>
        <td>${u.imageCount}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
