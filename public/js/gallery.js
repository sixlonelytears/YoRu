if (!checkAuth()) throw new Error('Not authenticated');
initNavbar();

let currentPage = 1;
let deleteTargetId = null;
let pendingFile = null;

loadGallery();
initDropzoneEvents();

async function loadGallery(page = 1) {
  currentPage = page;
  try {
    const res = await apiCall(`/api/images/gallery?page=${page}&limit=12`);
    const { images, total, totalPages } = res.data;
    const grid = document.getElementById('galleryGrid');
    const empty = document.getElementById('emptyState');
    const badge = document.getElementById('galleryCountBadge');

    if (badge) badge.textContent = total || images.length;

    if (images.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('d-none');
      document.getElementById('paginationNav').classList.add('d-none');
      return;
    }

    empty.classList.add('d-none');
    document.getElementById('paginationNav').classList.remove('d-none');

    grid.innerHTML = images.map(img => {
      const ext = (img.originalName.split('.').pop() || 'IMG').toUpperCase();
      const dims = (img.width && img.height) ? `${img.width} × ${img.height} px` : 'Gốc';
      const fallbackSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='220' viewBox='0 0 400 220'%3E%3Crect width='100%25' height='100%25' fill='%23FFF9E6'/%3E%3Crect x='15' y='15' width='370' height='190' fill='%23FFFFFF' stroke='%23000000' stroke-width='3' rx='8'/%3E%3Ccircle cx='200' cy='95' r='32' fill='%23FFEE32' stroke='%23000000' stroke-width='3'/%3E%3Ccircle cx='200' cy='95' r='14' fill='%23000000'/%3E%3Ctext x='200' y='155' fill='%23000000' font-family='sans-serif' font-weight='800' font-size='13' text-anchor='middle'%3EBẢN XEM TRƯỚC%3C/text%3E%3C/svg%3E";

      return `
        <div class="card-studio" id="card-${img.id}">
          <div class="card-preview-wrap">
            <span class="preview-tag-format">${ext}</span>
            <span class="preview-tag-dims">${dims}</span>
            <img src="${img.thumbnailUrl}" alt="${img.originalName}" loading="lazy"
                 onerror="this.onerror=null;this.src='${fallbackSvg}'">
          </div>
          <div class="card-body-studio">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="card-title-text" title="${img.originalName}">${img.originalName}</span>
              <span class="card-meta-text">${formatFileSize(img.size)}</span>
            </div>
            <div class="card-meta-sub mb-3">
              <i class="bi bi-clock me-1"></i> ${img.createdAt || 'Vừa xong'}
            </div>
            <div class="d-flex align-items-center gap-2">
              <a href="/editor.html?id=${img.id}" class="btn-card-edit flex-fill text-decoration-none text-center">
                <i class="bi bi-sliders2 me-1"></i> Sửa ảnh
              </a>
              <button class="btn-card-icon" onclick="showDetail(${img.id})" title="Chi tiết">
                <i class="bi bi-info-circle"></i>
              </button>
              <button class="btn-card-icon btn-card-danger" onclick="confirmDelete(${img.id})" title="Xoá ảnh">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    renderPagination(page, totalPages);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderPagination(current, total) {
  const ul = document.getElementById('pagination');
  if (total <= 1) { ul.innerHTML = ''; return; }
  let html = `<li class="page-item ${current===1?'disabled':''}"><a class="page-link" href="#" onclick="loadGallery(${current-1});return false">‹</a></li>`;
  for (let i = 1; i <= total; i++) {
    html += `<li class="page-item ${i===current?'active':''}"><a class="page-link" href="#" onclick="loadGallery(${i});return false">${i}</a></li>`;
  }
  html += `<li class="page-item ${current===total?'disabled':''}"><a class="page-link" href="#" onclick="loadGallery(${current+1});return false">›</a></li>`;
  ul.innerHTML = html;
}

// xu ly keo tha file
function initDropzoneEvents() {
  const dropzone = document.getElementById('dropzoneArea');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      setFileForUpload(files[0]);
    }
  });
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    setFileForUpload(files[0]);
  }
}

function setFileForUpload(file) {
  pendingFile = file;
  document.getElementById('selectedFileName').textContent = file.name;
  document.getElementById('selectedFileSize').textContent = formatFileSize(file.size);
  document.getElementById('dropzoneFileBar').classList.remove('d-none');
}

function clearSelectedFile() {
  pendingFile = null;
  document.getElementById('uploadInput').value = '';
  document.getElementById('dropzoneFileBar').classList.add('d-none');
}

async function handleUpload() {
  if (!pendingFile) {
    const input = document.getElementById('uploadInput');
    if (input.files.length) pendingFile = input.files[0];
  }
  if (!pendingFile) { showToast('Vui lòng chọn file ảnh', 'warning'); return; }

  const btn = document.getElementById('uploadBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang tải...';
  try {
    const fd = new FormData();
    fd.append('image', pendingFile);
    await apiCall('/api/images/upload', { method: 'POST', body: fd });
    showToast('Tải ảnh lên thành công!', 'success');
    clearSelectedFile();
    loadGallery(1);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-upload"></i> Bắt đầu tải lên';
  }
}

async function showDetail(id) {
  try {
    const res = await apiCall(`/api/images/${id}`);
    const img = res.data;
    document.getElementById('detailImage').src = img.fileUrl;
    document.getElementById('detailInfo').innerHTML = `
      <tr><th class="text-secondary">Filename</th><td class="text-white fw-semibold">${img.originalName}</td></tr>
      <tr><th class="text-secondary">Resolution</th><td class="card-meta-text text-accent-cyan">${img.width || '?'} × ${img.height || '?'} px</td></tr>
      <tr><th class="text-secondary">File Size</th><td class="card-meta-text text-white">${formatFileSize(img.size)}</td></tr>
      <tr><th class="text-secondary">Format</th><td class="text-white">${img.mimetype}</td></tr>
      <tr><th class="text-secondary">Uploaded At</th><td class="text-white">${img.createdAt}</td></tr>
    `;
    new bootstrap.Modal(document.getElementById('detailModal')).show();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function confirmDelete(id) {
  deleteTargetId = id;
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  try {
    await apiCall(`/api/images/${deleteTargetId}`, { method: 'DELETE' });
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    const card = document.getElementById(`card-${deleteTargetId}`);
    if (card) card.remove();
    showToast('Có lỗi xảy ra khi xóa ảnh', 'error');
    deleteTargetId = null;
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function handleChangePassword() {
  const cur = document.getElementById('currentPw').value;
  const np = document.getElementById('newPw').value;
  const cpEl = document.getElementById('confirmNewPw') || document.getElementById('confirmPw');
  const cp = cpEl ? cpEl.value : '';
  if (np !== cp) { showToast('Mật khẩu xác nhận không khớp', 'error'); return; }
  try {
    await apiCall('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: cur, newPassword: np }) });
    showToast('Đổi mật khẩu thành công!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('passwordModal')).hide();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
const changePassword = handleChangePassword;
