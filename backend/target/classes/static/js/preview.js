import {
  requireAuth, documents, bookmarks,
  showToast, hideLoader,
  initSidebar, initNavbar,
  formatDate, formatSize, getFileBadge, getFileIcon, getFileIconColor
} from './api.js';

requireAuth();
initSidebar();
initNavbar();
hideLoader();

const params     = new URLSearchParams(window.location.search);
const docId      = params.get('id');
let docData      = null;
let isBookmarked = false;

if (!docId) {
  showError();
} else {
  loadDocument(docId);
}

// ── Load Document ─────────────────────────────────────────────
async function loadDocument(id) {
  try {
    docData = await documents.getById(id);
    if (!docData) { showError(); return; }
    renderDocument(docData);
    checkBookmark(id);
    loadRelated(docData.fileType || docData.type, id);
  } catch (err) {
    showError();
    showToast(err.message || 'Failed to load document', 'error');
  }
}

// ── Render Document ───────────────────────────────────────────
function renderDocument(doc) {
  document.getElementById('previewLoader').style.display = 'none';
  document.getElementById('previewContent').style.display = 'block';

  const title = doc.title || doc.name || 'Untitled Document';
  document.title = `${title} — DocSearch AI`;

  document.getElementById('docTitle').textContent = title;
  document.getElementById('breadcrumbTitle').textContent = title.substring(0, 30) + (title.length > 30 ? '…' : '');

  const type = doc.fileType || doc.type || '';
  document.getElementById('metaType').innerHTML  = getFileBadge(type);
  document.getElementById('metaSize').textContent   = formatSize(doc.fileSize || doc.size);
  document.getElementById('metaAuthor').textContent  = doc.uploadedBy || doc.uploader?.username || '—';
  document.getElementById('metaDate').textContent   = formatDate(doc.uploadedAt || doc.createdAt);
  document.getElementById('metaId').textContent     = `#${doc.id}`;

  const descEl = document.getElementById('docDescription');
  if (descEl && doc.content) {
    descEl.textContent = doc.content.substring(0, 300) + (doc.content.length > 300 ? '…' : '');
  }

  renderPreview(doc);

  // Download button
  document.getElementById('downloadBtn')?.addEventListener('click', async () => {
    try {
      await documents.download(doc.id);
      showToast('Download started!', 'success');
    } catch (err) {
      showToast(err.message || 'Download failed', 'error');
    }
  });
}

// ── Render Preview Panel ──────────────────────────────────────
function renderPreview(doc) {
  const panel     = document.getElementById('previewPanel');
  const typeLabel = document.getElementById('previewType');
  const type      = (doc.fileType || doc.type || '').toUpperCase();

  if (!panel) return;

  if (type === 'PDF') {
    typeLabel.textContent = 'PDF Viewer';
    // Fetch with auth token first, then create blob URL for iframe
    panel.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-dim);">
      <div class="spinner" style="margin:0 auto 1rem;"></div>Loading PDF...
    </div>`;

    documents.downloadRaw(doc.id)
      .then(r => { if (!r.ok) throw new Error('PDF load failed'); return r.blob(); })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        panel.innerHTML = `
          <iframe
            src="${blobUrl}#toolbar=1&navpanes=1"
            class="preview-frame"
            title="${escapeHtml(doc.title || 'PDF')}">
          </iframe>
          <div style="text-align:center;margin-top:.75rem;">
            <a href="${blobUrl}" target="_blank" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-external-link-alt"></i> Open in New Tab
            </a>
          </div>`;
      })
      .catch(() => {
        panel.innerHTML = `<div style="text-align:center;padding:3rem 2rem;">
          <i class="fa-solid fa-file-pdf" style="font-size:4rem;color:#f87171;margin-bottom:1rem;"></i>
          <p style="color:var(--text-dim);">PDF preview unavailable.</p>
          <button class="btn btn-primary" onclick="document.getElementById('downloadBtn').click()">
            <i class="fa-solid fa-download"></i> Download to View
          </button>
        </div>`;
      });

  } else if (type === 'TXT') {
    typeLabel.textContent = 'Text Preview';
    const content = doc.content || doc.extractedText || '';
    panel.innerHTML = content
      ? `<pre class="preview-text">${escapeHtml(content)}</pre>`
      : noPreviewHtml('fa-file-slash', 'No text content available');

  } else if (type === 'DOCX' || type === 'DOC') {
    typeLabel.textContent = 'Extracted Text';
    const content = doc.content || doc.extractedText || '';
    panel.innerHTML = content
      ? `<div class="preview-text">${escapeHtml(content)}</div>`
      : noPreviewHtml('fa-file-word', 'Download to view this Word document', '#60a5fa');

  } else if (type === 'PPT' || type === 'PPTX') {
    typeLabel.textContent = 'Presentation';
    const content = doc.content || doc.extractedText || '';
    panel.innerHTML = content
      ? `<div class="preview-text">${escapeHtml(content)}</div>`
      : noPreviewHtml('fa-file-powerpoint', 'Download to view this presentation', '#fbbf24');

  } else {
    typeLabel.textContent = 'Preview';
    const icon  = getFileIcon(type);
    const color = getFileIconColor(type);
    panel.innerHTML = `
      <div style="text-align:center;padding:4rem 2rem;">
        <i class="fa-solid ${icon}" style="font-size:5rem;color:${color};margin-bottom:1.5rem;"></i>
        <h4 style="margin-bottom:.5rem;">${escapeHtml(doc.title || 'Document')}</h4>
        <p style="color:var(--text-muted);margin-bottom:1.5rem;">Preview not available for ${type} files.</p>
        <button class="btn btn-primary" onclick="document.getElementById('downloadBtn').click()">
          <i class="fa-solid fa-download"></i> Download to View
        </button>
      </div>`;
  }
}

function noPreviewHtml(icon, msg, color = 'var(--text-dim)') {
  return `<div style="text-align:center;padding:3rem 2rem;">
    <i class="fa-solid ${icon}" style="font-size:3rem;color:${color};margin-bottom:1rem;"></i>
    <p style="color:var(--text-dim);margin-bottom:1rem;">${msg}</p>
    <button class="btn btn-outline btn-sm" onclick="document.getElementById('downloadBtn').click()">
      <i class="fa-solid fa-download"></i> Download
    </button>
  </div>`;
}

// ── Check Bookmark ────────────────────────────────────────────
async function checkBookmark(id) {
  try {
    isBookmarked = await bookmarks.check(id);
    updateBookmarkBtn();
  } catch { /* ignore */ }

  document.getElementById('bookmarkBtn')?.addEventListener('click', async () => {
    try {
      isBookmarked = await bookmarks.toggle(id);
      updateBookmarkBtn();
      showToast(isBookmarked ? 'Added to bookmarks!' : 'Removed from bookmarks', isBookmarked ? 'success' : 'info');
    } catch (err) {
      showToast(err.message || 'Failed to update bookmark', 'error');
    }
  });
}

function updateBookmarkBtn() {
  const btn = document.getElementById('bookmarkBtn');
  if (!btn) return;
  if (isBookmarked) {
    btn.className = 'btn btn-primary';
    btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> <span>Bookmarked</span>';
  } else {
    btn.className = 'btn btn-secondary';
    btn.innerHTML = '<i class="fa-regular fa-bookmark"></i> <span>Bookmark</span>';
  }
}

// ── Related Documents ─────────────────────────────────────────
async function loadRelated(fileType, excludeId) {
  const container = document.getElementById('relatedDocs');
  if (!container) return;

  try {
    const res = await documents.getAll(0, 6);
    const docs = Array.isArray(res) ? res : (res?.content || []);
    const related = docs.filter(d => String(d.id) !== String(excludeId)).slice(0, 4);

    if (!related.length) {
      container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-dim);font-size:.85rem;">No related documents</div>`;
      return;
    }

    container.innerHTML = related.map(doc => `
      <a href="preview.html?id=${doc.id}" style="text-decoration:none;display:flex;align-items:center;gap:.75rem;padding:.85rem 1.25rem;border-bottom:1px solid rgba(51,65,85,.5);transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,.03)'" onmouseout="this.style.background=''">
        <div style="color:${getFileIconColor(doc.fileType || doc.type)};font-size:1.2rem;flex-shrink:0;">
          <i class="fa-solid ${getFileIcon(doc.fileType || doc.type)}"></i>
        </div>
        <div style="overflow:hidden;">
          <div style="font-size:.82rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(doc.title || doc.name || 'Untitled')}</div>
          <div style="font-size:.72rem;color:var(--text-dim);">${formatDate(doc.uploadedAt || doc.createdAt)}</div>
        </div>
      </a>
    `).join('');

    const last = container.querySelector('a:last-child');
    if (last) last.style.borderBottom = 'none';
  } catch {
    container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-dim);font-size:.85rem;">Failed to load related documents</div>`;
  }
}

function showError() {
  document.getElementById('previewLoader').style.display = 'none';
  const errEl = document.getElementById('previewError');
  if (errEl) errEl.style.display = 'block';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
