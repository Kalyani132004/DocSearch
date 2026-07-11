import {
  requireAuth, bookmarks, documents,
  showToast, hideLoader,
  initSidebar, initNavbar,
  formatDate, formatSize, getFileBadge, getFileIcon, getFileIconColor
} from './api.js';

requireAuth();
initSidebar();
initNavbar();
hideLoader();

let allBookmarks = [];

// ── Load Bookmarks ────────────────────────────────────────────
async function loadBookmarks() {
  const grid = document.getElementById('bookmarksGrid');
  try {
    const res = await bookmarks.getAll();
    allBookmarks = Array.isArray(res) ? res : (res?.content || []);
    renderBookmarks(allBookmarks);
    updateCount(allBookmarks.length);
  } catch (err) {
    grid.innerHTML = `<div class="col-12">
      <div class="empty-state" style="padding:4rem 2rem;">
        <div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation" style="color:var(--danger);"></i></div>
        <h4>Failed to load bookmarks</h4>
        <p>${err.message}</p>
        <button class="btn btn-primary btn-sm" onclick="loadBookmarks()">Retry</button>
      </div>
    </div>`;
  }
}

// ── Render ────────────────────────────────────────────────────
function renderBookmarks(items) {
  const grid = document.getElementById('bookmarksGrid');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `<div class="col-12">
      <div class="empty-state" style="padding:5rem 2rem;">
        <div class="empty-state-icon"><i class="fa-solid fa-bookmark" style="opacity:.25;"></i></div>
        <h4>No Bookmarks Yet</h4>
        <p>Find documents you love and bookmark them for quick access later.</p>
        <a href="results.html" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-magnifying-glass"></i> Search Documents
        </a>
      </div>
    </div>`;
    return;
  }

  grid.innerHTML = items.map((bm, idx) => {
    const doc     = bm.document || bm;
    const title   = doc.title || doc.name || 'Untitled';
    const type    = doc.fileType || doc.type || '';
    const iconColor = getFileIconColor(type);
    const icon    = getFileIcon(type);

    return `
      <div class="col-sm-6 col-lg-4 animate-fade-up" style="animation-delay:${idx * 0.05}s;">
        <div class="bookmark-card">
          <div style="display:flex; align-items:center; gap:.75rem;">
            <div class="bookmark-card-icon" style="background: rgba(${hexToRgb(iconColor)}, 0.15);">
              <i class="fa-solid ${icon}" style="color:${iconColor};"></i>
            </div>
            <div style="flex:1; min-width:0;">
              <div class="bookmark-card-title" title="${title}">${title}</div>
              <div style="display:flex; align-items:center; gap:.5rem; margin-top:.3rem; flex-wrap:wrap;">
                ${getFileBadge(type)}
                <span style="font-size:.74rem; color:var(--text-dim);">${formatSize(doc.fileSize || doc.size)}</span>
              </div>
            </div>
          </div>

          <div style="font-size:.78rem; color:var(--text-dim); display:flex; align-items:center; gap:.35rem;">
            <i class="fa-regular fa-calendar"></i>
            Bookmarked ${formatDate(bm.createdAt || bm.bookmarkedAt || doc.uploadedAt)}
          </div>

          <div style="display:flex; gap:.5rem; margin-top:.25rem; flex-wrap:wrap;">
            <a href="preview.html?id=${doc.id}" class="btn btn-secondary btn-sm" style="flex:1;">
              <i class="fa-solid fa-eye"></i> Preview
            </a>
            <button class="btn btn-outline btn-sm" onclick="downloadDoc(${doc.id})" title="Download">
              <i class="fa-solid fa-download"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="removeBookmark(${doc.id}, this)" title="Remove bookmark">
              <i class="fa-solid fa-bookmark-slash"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Update Count ──────────────────────────────────────────────
function updateCount(count) {
  const el = document.getElementById('bookmarkCount');
  if (el) el.textContent = `${count} bookmarked document${count !== 1 ? 's' : ''}`;
}

// ── Filter ────────────────────────────────────────────────────
function filterBookmarks() {
  const q    = document.getElementById('bmSearch')?.value.toLowerCase() || '';
  const sort = document.getElementById('bmSort')?.value || 'date_desc';

  let filtered = [...allBookmarks];

  if (q) {
    filtered = filtered.filter(bm => {
      const doc = bm.document || bm;
      const title = (doc.title || doc.name || '').toLowerCase();
      return title.includes(q);
    });
  }

  filtered.sort((a, b) => {
    const da = a.document || a;
    const db = b.document || b;
    if (sort === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sort === 'date_asc')  return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (sort === 'name_asc')  return (da.title||'').localeCompare(db.title||'');
    return 0;
  });

  renderBookmarks(filtered);
  updateCount(filtered.length);
}

document.getElementById('bmSearch')?.addEventListener('input', filterBookmarks);
document.getElementById('bmSort')?.addEventListener('change', filterBookmarks);

// ── Remove Bookmark ───────────────────────────────────────────
window.removeBookmark = async (docId, btn) => {
  const card = btn.closest('.col-sm-6, .col-lg-4, [class*="col"]');
  try {
    await bookmarks.remove(docId);
    allBookmarks = allBookmarks.filter(bm => {
      const doc = bm.document || bm;
      return doc.id !== docId;
    });
    card?.remove();
    updateCount(document.querySelectorAll('.bookmark-card').length);
    showToast('Bookmark removed', 'info');

    if (!allBookmarks.length) renderBookmarks([]);
  } catch (err) {
    showToast(err.message || 'Failed to remove bookmark', 'error');
  }
};

// ── Download ──────────────────────────────────────────────────
window.downloadDoc = async (id) => {
  try {
    await documents.download(id);
    showToast('Download started!', 'success');
  } catch (err) {
    showToast(err.message || 'Download failed', 'error');
  }
};

// ── Helpers ───────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `${r},${g},${b}`;
}

loadBookmarks();
