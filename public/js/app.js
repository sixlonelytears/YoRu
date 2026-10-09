function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
function isLoggedIn() { return !!getToken(); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/'; }

function checkAuth() {
  if (!isLoggedIn()) { window.location.href = '/'; return false; }
  return true;
}

async function apiCall(url, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) { logout(); throw new Error('Phiên đăng nhập hết hạn'); }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Lỗi hệ thống');
    return data;
  }
  if (!res.ok) throw new Error('Lỗi hệ thống');
  return res;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-custom toast-${type}`;
  toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}-fill me-2"></i><span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function initNavbar() {
  const user = getUser();
  const userEmail = document.getElementById('navUserEmail');
  const adminLink = document.getElementById('navAdminLink');
  if (userEmail && user) userEmail.textContent = user.email;
  if (adminLink) adminLink.style.display = isAdmin() ? '' : 'none';
}
