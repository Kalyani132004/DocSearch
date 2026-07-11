import {
  requireAuth, documents, showToast, hideLoader,
  initSidebar, initNavbar,
  formatDate, formatSize, getFileIcon, getFileIconColor, getFileBadge
} from './api.js';

requireAuth();
initSidebar();
initNavbar();
hideLoader();

const dropZone   = document.getElementById('dropZone');
const fileInput  = document.getElementById('fileInput');
const fileQueue  = document.getElementById('fileQueue');
const uploadAllBtn  = document.getElementById('uploadAllBtn');
const clearQueueBtn = document.getElementById('clearQueueBtn');

let queue = []; // { file, id, status }

// ── Drag-Drop Events ──────────────────────────────────────────
dropZone?.addEventListener('click', () => fileInput?.click());
dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  addFilesToQueue([...e.dataTransfer.files]);
});

fileInput?.addEventListener('change', () => {
  addFilesToQueue([...fileInput.files]);
  fileInput.value = '';
});

// ── Add Files to Queue ────────────────────────────────────────
const ALLOWED = ['pdf','docx','doc','txt','ppt','pptx','xlsx','xls'];
const MAX_SIZE = 50 * 1024 * 1024;

function addFilesToQueue(files) {
  files.forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED.includes(ext)) {
      showToast(`${file.name}: Unsupported file type`, 'warning');
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast(`${file.name}: File too large (max 50MB)`, 'warning');
      return;
    }
    // No duplicates
    if (queue.find(q => q.file.name === file.name && q.file.size === file.size)) {
      showToast(`${file.name} is already in queue`, 'info');
      return;
    }
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    queue.push({ file, id, status: 'pending' });
  });
  renderQueue();
}

// ── Render Queue ──────────────────────────────────────────────
function renderQueue() {
  if (!fileQueue) return;
  fileQueue.innerHTML = queue.map(item => `
    <div class="file-queue-item" id="${item.id}">
      <div class="file-queue-icon" style="color:${getFileIconColor(item.file.name.split('.').pop())}">
        <i class="fa-solid ${getFileIcon(item.file.name.split('.').pop())}"></i>
      </div>
      <div class="file-queue-info">
        <div class="file-queue-name" title="${item.file.name}">${item.file.name}</div>
        <div class="file-queue-size">${formatSize(item.file.size)} · ${item.file.name.split('.').pop().toUpperCase()}</div>
        <div class="file-queue-progress" id="progress-${item.id}">
          ${item.status === 'uploading' ? `<div class="progress"><div class="progress-bar" id="bar-${item.id}" style="width:0%"></div></div>` : ''}
          ${item.status === 'done'      ? `<div style="color:var(--success);font-size:.76rem;margin-top:.2rem"><i class="fa-solid fa-circle-check"></i> Uploaded successfully</div>` : ''}
          ${item.status === 'error'     ? `<div style="color:var(--danger);font-size:.76rem;margin-top:.2rem"><i class="fa-solid fa-circle-xmark"></i> Upload failed</div>` : ''}
        </div>
      </div>
      ${item.status === 'pending' ? `
        <div style="display:flex; gap:.3rem; flex-shrink:0;">
          <button class="btn btn-primary btn-sm btn-icon" onclick="uploadSingle('${item.id}')" title="Upload">
            <i class="fa-solid fa-upload"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="removeFromQueue('${item.id}')" title="Remove">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>` : ''}
      ${item.status === 'done' ? `
        <i class="fa-solid fa-circle-check" style="color:var(--success); font-size:1.2rem; flex-shrink:0;"></i>` : ''}
      ${item.status === 'error' ? `
        <button class="btn btn-danger btn-sm btn-icon" onclick="removeFromQueue('${item.id}')" title="Remove">
          <i class="fa-solid fa-xmark"></i>
        </button>` : ''}
    </div>
  `).join('');

  const hasPending = queue.some(q => q.status === 'pending');
  uploadAllBtn.style.display  = hasPending ? 'inline-flex' : 'none';
  clearQueueBtn.style.display = queue.length ? 'inline-flex' : 'none';
}

// ── Upload Single File ────────────────────────────────────────
window.uploadSingle = async (id) => {
  const item = queue.find(q => q.id === id);
  if (!item || item.status !== 'pending') return;

  item.status = 'uploading';
  renderQueue();

  try {
    await documents.upload(item.file, (percent) => {
      const bar = document.getElementById(`bar-${id}`);
      if (bar) bar.style.width = `${percent}%`;
    });
    item.status = 'done';
    showToast(`${item.file.name} uploaded successfully!`, 'success');
    await loadRecentUploads();
  } catch (err) {
    item.status = 'error';
    showToast(`Failed to upload ${item.file.name}: ${err.message}`, 'error');
  }

  renderQueue();
};

// ── Upload All ────────────────────────────────────────────────
uploadAllBtn?.addEventListener('click', async () => {
  const pending = queue.filter(q => q.status === 'pending');
  for (const item of pending) {
    await uploadSingle(item.id);
  }
});

// ── Remove From Queue ─────────────────────────────────────────
window.removeFromQueue = (id) => {
  queue = queue.filter(q => q.id !== id);
  renderQueue();
};

// ── Clear Queue ───────────────────────────────────────────────
clearQueueBtn?.addEventListener('click', () => {
  queue = queue.filter(q => q.status === 'uploading');
  renderQueue();
});

// ── Load Recent Uploads ───────────────────────────────────────
async function loadRecentUploads() {
  const list = document.getElementById('recentUploadsList');
  if (!list) return;

  try {
    const res = await documents.getMy(0, 6);
    const docs = Array.isArray(res) ? res : (res?.content || []);

    if (!docs.length) {
      list.innerHTML = `<div class="empty-state" style="padding:1.5rem">
        <div class="empty-state-icon" style="font-size:2rem"><i class="fa-solid fa-file-circle-plus"></i></div>
        <h4 style="font-size:.95rem;">No uploads yet</h4>
        <p>Your uploaded files will appear here</p>
      </div>`;
      return;
    }

    list.innerHTML = docs.map(doc => `
      <div class="file-queue-item" style="margin:0; border:none; border-bottom:1px solid var(--border); border-radius:0; padding:.85rem 1.25rem;">
        <div class="file-queue-icon" style="color:${getFileIconColor(doc.fileType || doc.type || '')}; font-size:1.3rem;">
          <i class="fa-solid ${getFileIcon(doc.fileType || doc.type || '')}"></i>
        </div>
        <div class="file-queue-info">
          <div class="file-queue-name" title="${doc.title || doc.name}">${doc.title || doc.name || 'Untitled'}</div>
          <div class="file-queue-size">${formatSize(doc.fileSize || doc.size)} · ${formatDate(doc.uploadedAt || doc.createdAt)}</div>
        </div>
        <div style="display:flex; gap:.3rem; flex-shrink:0;">
          <a href="preview.html?id=${doc.id}" class="btn btn-secondary btn-sm btn-icon" title="Preview">
            <i class="fa-solid fa-eye"></i>
          </a>
        </div>
      </div>
    `).join('');
    // Remove last border
    const items = list.querySelectorAll('.file-queue-item');
    if (items.length) items[items.length - 1].style.borderBottom = 'none';
  } catch {
    list.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-dim); font-size:.85rem;">Failed to load recent uploads</div>`;
  }
}

loadRecentUploads();
