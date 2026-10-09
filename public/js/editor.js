if (!checkAuth()) throw new Error('Not authenticated');
initNavbar();

const params = new URLSearchParams(window.location.search);
const imageId = parseInt(params.get('id'));
if (!imageId) { window.location.href = '/gallery.html'; }

// Studio state with History Stack for Undo/Reset
let state = {
  imageId,
  originalUrl: '',
  originalWidth: 0,
  originalHeight: 0,
  processedId: null,
  width: 0,
  height: 0,
  aspectRatio: 1
};

let historyStack = [];

// Keyboard shortcut: Ctrl+Z for Undo
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (historyStack.length > 0) handleUndo();
  }
});

// Window resize listener to keep crop overlay aligned
window.addEventListener('resize', () => {
  if (cropActive) {
    syncCropOverlaySize();
    renderCropBox();
  }
});

loadImage();

async function loadImage() {
  try {
    const res = await apiCall(`/api/images/${imageId}`);
    const img = res.data;
    state.originalUrl = img.fileUrl;
    state.originalWidth = img.width;
    state.originalHeight = img.height;
    state.width = img.width;
    state.height = img.height;
    state.aspectRatio = img.width / img.height;

    document.getElementById('imageName').textContent = img.originalName;
    document.getElementById('imageMeta').textContent = `${img.width}×${img.height} px · ${formatFileSize(img.size)}`;
    
    const previewImg = document.getElementById('previewImage');
    previewImg.onload = () => {
      updateFilterThumbnails(previewImg.src);
      if (cropActive) {
        syncCropOverlaySize();
        resetCropBoxToDefault();
      }
    };
    previewImg.src = img.fileUrl;
    document.getElementById('canvasMeta').textContent = `${img.width} × ${img.height} px`;

    document.getElementById('resizeW').value = img.width;
    document.getElementById('resizeH').value = img.height;
    document.getElementById('cropW').value = img.width;
    document.getElementById('cropH').value = img.height;

    updateHistoryButtons();
    initInteractiveCrop();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateFilterThumbnails(url) {
  const tGray = document.getElementById('thumbGrayscale');
  const tSepia = document.getElementById('thumbSepia');
  const tBlur = document.getElementById('thumbBlur');
  if (tGray) tGray.style.backgroundImage = `url('${url}')`;
  if (tSepia) tSepia.style.backgroundImage = `url('${url}')`;
  if (tBlur) tBlur.style.backgroundImage = `url('${url}')`;
}

// ==========================================================================
// Tool Tab Navigation
// ==========================================================================
function switchToolTab(tabName) {
  // Update tab buttons
  const tabs = document.querySelectorAll('.tool-tab-btn');
  tabs.forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', onclickAttr.includes(`'${tabName}'`));
  });

  // Update panes
  const panes = document.querySelectorAll('.tool-pane');
  panes.forEach(p => p.classList.remove('active'));
  const targetPane = document.getElementById(`pane-${tabName}`);
  if (targetPane) targetPane.classList.add('active');

  // Handle Watermark overlay
  if (tabName === 'watermark') {
    updateWatermarkPreview();
  } else {
    const wmEl = document.getElementById('watermarkPreview');
    if (wmEl) wmEl.classList.add('d-none');
  }

  // Handle Crop overlay activation
  if (tabName === 'crop') {
    setCropActive(true);
  } else {
    setCropActive(false);
  }

  // Reset live scale preview if leaving resize tab
  if (tabName !== 'resize') {
    resetLiveScalePreview();
  }
}

// ==========================================================================
// Interactive Crop Engine (Drag & Drop, 8 Anchor Handles, Free Draw)
// ==========================================================================
let cropActive = false;
let cropBox = { x: 0, y: 0, w: 0, h: 0 };
let dragMode = null; // 'move', 'draw', or handle name ('tl', 'tr', etc.)
let dragStartX = 0, dragStartY = 0;
let initialBox = null;
let cropDrawOrigin = { x: 0, y: 0 };

function setCropActive(active) {
  cropActive = active;
  const overlay = document.getElementById('cropOverlay');
  if (!overlay) return;
  
  if (active) {
    overlay.classList.remove('d-none');
    syncCropOverlaySize();
    resetCropBoxToDefault();
  } else {
    overlay.classList.add('d-none');
  }
}

function syncCropOverlaySize() {
  const img = document.getElementById('previewImage');
  const overlay = document.getElementById('cropOverlay');
  if (!img || !overlay) return;
  overlay.style.width = `${img.clientWidth}px`;
  overlay.style.height = `${img.clientHeight}px`;
}

function resetCropBoxToDefault() {
  const img = document.getElementById('previewImage');
  if (!img || !img.clientWidth || !img.clientHeight) return;
  const dispW = img.clientWidth;
  const dispH = img.clientHeight;

  // Default to 75% centered box
  const boxW = Math.max(40, Math.round(dispW * 0.75));
  const boxH = Math.max(40, Math.round(dispH * 0.75));
  const boxX = Math.round((dispW - boxW) / 2);
  const boxY = Math.round((dispH - boxH) / 2);

  cropBox = { x: boxX, y: boxY, w: boxW, h: boxH };
  renderCropBox();
  syncCropBoxToInputs();
}

function renderCropBox() {
  const el = document.getElementById('cropBox');
  if (!el) return;
  el.style.left = `${cropBox.x}px`;
  el.style.top = `${cropBox.y}px`;
  el.style.width = `${cropBox.w}px`;
  el.style.height = `${cropBox.h}px`;
}

function syncCropBoxToInputs() {
  const img = document.getElementById('previewImage');
  if (!img || !img.clientWidth || !state.width) return;
  const scaleX = state.width / img.clientWidth;
  const scaleY = state.height / img.clientHeight;

  const realX = Math.max(0, Math.round(cropBox.x * scaleX));
  const realY = Math.max(0, Math.round(cropBox.y * scaleY));
  const realW = Math.min(state.width - realX, Math.round(cropBox.w * scaleX));
  const realH = Math.min(state.height - realY, Math.round(cropBox.h * scaleY));

  document.getElementById('cropX').value = realX;
  document.getElementById('cropY').value = realY;
  document.getElementById('cropW').value = realW;
  document.getElementById('cropH').value = realH;

  const badge = document.getElementById('cropDimsBadge');
  if (badge) badge.textContent = `${realW} × ${realH} px`;
}

function syncInputToCropBox() {
  const img = document.getElementById('previewImage');
  if (!img || !img.clientWidth || !state.width) return;
  const scaleX = img.clientWidth / state.width;
  const scaleY = img.clientHeight / state.height;

  const x = parseInt(document.getElementById('cropX').value) || 0;
  const y = parseInt(document.getElementById('cropY').value) || 0;
  const w = parseInt(document.getElementById('cropW').value) || state.width;
  const h = parseInt(document.getElementById('cropH').value) || state.height;

  cropBox.x = Math.round(x * scaleX);
  cropBox.y = Math.round(y * scaleY);
  cropBox.w = Math.round(w * scaleX);
  cropBox.h = Math.round(h * scaleY);
  renderCropBox();
}

function initInteractiveCrop() {
  const cropEl = document.getElementById('cropBox');
  const overlay = document.getElementById('cropOverlay');
  if (!cropEl || !overlay) return;

  function handlePointerDown(e) {
    if (!cropActive) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined) return;

    const handle = e.target.dataset.handle;
    if (handle) {
      // Dragging a specific handle
      dragMode = handle;
      e.stopPropagation();
      e.preventDefault();
    } else if (e.target === cropEl || cropEl.contains(e.target)) {
      // Dragging inside box to move
      dragMode = 'move';
      e.stopPropagation();
      e.preventDefault();
    } else if (e.target === overlay) {
      // Clicking on overlay outside box -> draw new box
      dragMode = 'draw';
      const rect = overlay.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const clickY = Math.max(0, Math.min(clientY - rect.top, rect.height));
      cropDrawOrigin = { x: clickX, y: clickY };
      cropBox = { x: clickX, y: clickY, w: 10, h: 10 };
      renderCropBox();
      e.preventDefault();
    }

    dragStartX = clientX;
    dragStartY = clientY;
    initialBox = { ...cropBox };
  }

  function handlePointerMove(e) {
    if (!dragMode) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined) return;

    const img = document.getElementById('previewImage');
    if (!img) return;
    const maxW = img.clientWidth;
    const maxH = img.clientHeight;

    const dx = clientX - dragStartX;
    const dy = clientY - dragStartY;

    if (dragMode === 'move') {
      let nextX = initialBox.x + dx;
      let nextY = initialBox.y + dy;
      nextX = Math.max(0, Math.min(nextX, maxW - initialBox.w));
      nextY = Math.max(0, Math.min(nextY, maxH - initialBox.h));
      cropBox.x = nextX;
      cropBox.y = nextY;
    } else if (dragMode === 'draw') {
      const rect = overlay.getBoundingClientRect();
      const currX = Math.max(0, Math.min(clientX - rect.left, maxW));
      const currY = Math.max(0, Math.min(clientY - rect.top, maxH));
      
      const x = Math.min(cropDrawOrigin.x, currX);
      const y = Math.min(cropDrawOrigin.y, currY);
      const w = Math.max(20, Math.abs(currX - cropDrawOrigin.x));
      const h = Math.max(20, Math.abs(currY - cropDrawOrigin.y));
      cropBox = { x, y, w, h };
    } else {
      // Resizing via handle
      let { x, y, w, h } = initialBox;
      const minSize = 20;

      if (dragMode.includes('r')) {
        w = Math.max(minSize, Math.min(initialBox.w + dx, maxW - x));
      }
      if (dragMode.includes('b')) {
        h = Math.max(minSize, Math.min(initialBox.h + dy, maxH - y));
      }
      if (dragMode.includes('l')) {
        const potentialW = initialBox.w - dx;
        if (potentialW >= minSize && initialBox.x + dx >= 0) {
          x = initialBox.x + dx;
          w = potentialW;
        }
      }
      if (dragMode.includes('t')) {
        const potentialH = initialBox.h - dy;
        if (potentialH >= minSize && initialBox.y + dy >= 0) {
          y = initialBox.y + dy;
          h = potentialH;
        }
      }
      cropBox = { x, y, w, h };
    }

    renderCropBox();
    syncCropBoxToInputs();
  }

  function handlePointerUp() {
    dragMode = null;
  }

  // Mouse events
  cropEl.addEventListener('mousedown', handlePointerDown);
  overlay.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  // Touch events for mobile/trackpad
  cropEl.addEventListener('touchstart', handlePointerDown, { passive: false });
  overlay.addEventListener('touchstart', handlePointerDown, { passive: false });
  window.addEventListener('touchmove', handlePointerMove, { passive: false });
  window.addEventListener('touchend', handlePointerUp);
}

// ==========================================================================
// Interactive Scale Slider, Presets & Live Canvas Preview
// ==========================================================================
function handleScaleSlider(percent) {
  document.getElementById('scalePercentDisplay').textContent = `${percent}%`;
  const ratio = parseInt(percent) / 100;
  const newW = Math.round(state.width * ratio);
  const newH = Math.round(state.height * ratio);
  document.getElementById('resizeW').value = newW;
  document.getElementById('resizeH').value = newH;

  // Live CSS scale preview on the canvas
  applyLiveScalePreview(ratio);
}

function applyScalePreset(factor) {
  const percent = Math.round(factor * 100);
  const range = document.getElementById('resizeScaleRange');
  if (range) range.value = percent;
  handleScaleSlider(percent);
}

function applyLiveScalePreview(scale) {
  const wrapper = document.getElementById('canvasWrapper');
  if (!wrapper) return;
  // Apply smooth visual scale preview
  wrapper.style.transform = `scale(${scale})`;
}

function resetLiveScalePreview() {
  const wrapper = document.getElementById('canvasWrapper');
  if (wrapper) wrapper.style.transform = '';
  const range = document.getElementById('resizeScaleRange');
  if (range) range.value = 100;
  const disp = document.getElementById('scalePercentDisplay');
  if (disp) disp.textContent = '100%';
}

document.getElementById('resizeW').addEventListener('input', function () {
  if (document.getElementById('keepRatio').checked && state.aspectRatio) {
    document.getElementById('resizeH').value = Math.round(this.value / state.aspectRatio);
  }
  const ratio = (parseInt(this.value) || state.width) / state.width;
  applyLiveScalePreview(ratio);
});

document.getElementById('resizeH').addEventListener('input', function () {
  if (document.getElementById('keepRatio').checked && state.aspectRatio) {
    document.getElementById('resizeW').value = Math.round(this.value * state.aspectRatio);
  }
  const ratio = (parseInt(this.value) || state.height) / state.height;
  applyLiveScalePreview(ratio);
});

function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('d-none', !show);
}

function updateHistoryButtons() {
  const btnUndo = document.getElementById('btnUndo');
  const btnReset = document.getElementById('btnReset');
  if (btnUndo) btnUndo.disabled = historyStack.length === 0;
  if (btnReset) btnReset.disabled = !state.processedId;
}

// Transform execution with history push
async function applyTransform(url, body) {
  showLoading(true);
  try {
    // Push current state into history before making changes
    historyStack.push({
      processedId: state.processedId,
      previewUrl: document.getElementById('previewImage').src,
      width: state.width,
      height: state.height
    });

    const payload = { imageId: state.imageId, ...body };
    if (state.processedId) payload.processedId = state.processedId;

    const res = await apiCall(url, { method: 'POST', body: JSON.stringify(payload) });

    state.processedId = res.data.processedId;
    state.width = res.data.width;
    state.height = res.data.height;
    state.aspectRatio = res.data.width / res.data.height;

    // Reset visual scale preview back to 100% since new dimensions are baked into the image
    resetLiveScalePreview();

    const newUrl = res.data.previewUrl + '?t=' + Date.now();
    const previewImg = document.getElementById('previewImage');
    previewImg.src = newUrl;
    document.getElementById('canvasMeta').textContent = `${res.data.width} × ${res.data.height} px`;
    document.getElementById('imageMeta').textContent = `${res.data.width}×${res.data.height} px · ${formatFileSize(res.data.size)}`;

    // Update input fields with new dimensions
    document.getElementById('resizeW').value = res.data.width;
    document.getElementById('resizeH').value = res.data.height;
    document.getElementById('cropW').value = res.data.width;
    document.getElementById('cropH').value = res.data.height;

    updateFilterThumbnails(newUrl);
    updateHistoryButtons();
    setCropActive(false);
    showToast('Áp dụng thành công!', 'success');
  } catch (err) {
    // Revert history push on failure
    historyStack.pop();
    updateHistoryButtons();
    showToast(err.message, 'error');
  } finally {
    showLoading(false);
  }
}

// UNDO: Step back to previous edit
function handleUndo() {
  if (historyStack.length === 0) return;
  const prev = historyStack.pop();
  state.processedId = prev.processedId;
  state.width = prev.width;
  state.height = prev.height;
  state.aspectRatio = prev.width / prev.height;

  resetLiveScalePreview();
  const previewImg = document.getElementById('previewImage');
  previewImg.src = prev.previewUrl;
  document.getElementById('canvasMeta').textContent = `${prev.width} × ${prev.height} px`;
  document.getElementById('imageMeta').textContent = `${prev.width}×${prev.height} px`;
  document.getElementById('resizeW').value = prev.width;
  document.getElementById('resizeH').value = prev.height;
  document.getElementById('cropW').value = prev.width;
  document.getElementById('cropH').value = prev.height;

  updateFilterThumbnails(prev.previewUrl);
  updateHistoryButtons();
  setCropActive(false);
  showToast('Đã hoàn tác thao tác trước đó', 'info');
}

// RESET: Back to original uploaded image
function handleResetOriginal() {
  if (!state.processedId) return;
  historyStack = [];
  state.processedId = null;
  state.width = state.originalWidth;
  state.height = state.originalHeight;
  state.aspectRatio = state.originalWidth / state.originalHeight;

  resetLiveScalePreview();
  const originalFullUrl = state.originalUrl + '?t=' + Date.now();
  const previewImg = document.getElementById('previewImage');
  previewImg.src = originalFullUrl;
  document.getElementById('canvasMeta').textContent = `${state.originalWidth} × ${state.originalHeight} px`;
  document.getElementById('imageMeta').textContent = `${state.originalWidth}×${state.originalHeight} px`;
  document.getElementById('resizeW').value = state.originalWidth;
  document.getElementById('resizeH').value = state.originalHeight;
  document.getElementById('cropW').value = state.originalWidth;
  document.getElementById('cropH').value = state.originalHeight;

  updateFilterThumbnails(originalFullUrl);
  updateHistoryButtons();
  setCropActive(false);
  showToast('Đã khôi phục ảnh gốc ban đầu', 'info');
}

function handleResize() {
  const w = parseInt(document.getElementById('resizeW').value);
  const h = parseInt(document.getElementById('resizeH').value);
  applyTransform('/api/transform/resize', {
    width: w,
    height: h,
    keepAspectRatio: document.getElementById('keepRatio').checked
  });
}

function handleCrop() {
  applyTransform('/api/transform/crop', {
    x: parseInt(document.getElementById('cropX').value),
    y: parseInt(document.getElementById('cropY').value),
    width: parseInt(document.getElementById('cropW').value),
    height: parseInt(document.getElementById('cropH').value)
  });
}

function handleRotate(angle) { applyTransform('/api/transform/rotate', { angle }); }
function handleFlip(direction) { applyTransform('/api/transform/flip', { direction }); }
function handleFilter(filter) { applyTransform('/api/transform/filter', { filter }); }

function handleWatermark() {
  applyTransform('/api/transform/watermark', {
    text: document.getElementById('wmText').value,
    color: document.getElementById('wmColor').value,
    position: document.getElementById('wmPosition').value
  });
  const wmEl = document.getElementById('watermarkPreview');
  if (wmEl) wmEl.classList.add('d-none');
}

function setWmColor(color) {
  const input = document.getElementById('wmColor');
  if (input) {
    input.value = color;
    updateWatermarkPreview();
  }
}

function updateWatermarkPreview() {
  const el = document.getElementById('watermarkPreview');
  if (!el) return;
  const wmPane = document.getElementById('pane-watermark');
  const isActive = wmPane && wmPane.classList.contains('active');
  const text = (document.getElementById('wmText')?.value || '').trim();

  if (!isActive || !text) {
    el.classList.add('d-none');
    return;
  }

  el.classList.remove('d-none');
  el.textContent = text;
  el.style.color = document.getElementById('wmColor')?.value || '#ffffff';
  const pos = document.getElementById('wmPosition')?.value || 'bottom-right';
  el.className = `watermark-overlay pos-${pos}`;
}

document.getElementById('wmText')?.addEventListener('input', updateWatermarkPreview);
document.getElementById('wmColor')?.addEventListener('input', updateWatermarkPreview);
document.getElementById('wmPosition')?.addEventListener('change', updateWatermarkPreview);

async function handleExport() {
  showLoading(true);
  try {
    const body = {
      imageId: state.imageId,
      format: document.getElementById('exportFormat').value,
      quality: parseInt(document.getElementById('exportQuality').value)
    };
    if (state.processedId) body.processedId = state.processedId;

    const token = getToken();
    const res = await fetch('/api/transform/export', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message); }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export.${body.format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Tải ảnh thành công!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    showLoading(false);
  }
}
