import {
  requireAuth, search, bookmarks, documents,
  showToast, showLoader, hideLoader,
  initSidebar, initNavbar,
  formatDate, formatSize, getFileBadge, highlightText
} from './api.js';

requireAuth();
initSidebar();
initNavbar();
hideLoader();

let currentPage = 0;
let totalPages  = 0;
let currentQuery = '';
let isSearching = false;

// ── URL Params ────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const initialQuery = params.get('q') || '';
const searchInput  = document.getElementById('searchInput');
if (searchInput && initialQuery) {
  searchInput.value = initialQuery;
}

// ── Auto Search on Load ───────────────────────────────────────
if (initialQuery) {
  doSearch(initialQuery, 0);
} else {
  document.getElementById('resultsContainer').innerHTML = `
    <div class="empty-state" style="padding: 5rem 2rem;">
      <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
      <h4>Start Searching</h4>
      <p>Enter keywords above to find documents instantly</p>
    </div>`;
}

// ── Search Button ─────────────────────────────────────────────
document.getElementById('searchBtn')?.addEventListener('click', () => {
  const q = searchInput?.value.trim();
  if (q) doSearch(q, 0);
});

searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = searchInput.value.trim();
    if (q) doSearch(q, 0);
    hideSuggestions();
  }
  if (e.key === 'Escape') hideSuggestions();
});

// ── Apply Filters ─────────────────────────────────────────────
document.getElementById('applyFilters')?.addEventListener('click', () => {
  const q = searchInput?.value.trim();
  if (q) doSearch(q, 0);
});

document.getElementById('clearFilters')?.addEventListener('click', () => {
  document.querySelectorAll('.type-filter').forEach(c => c.checked = false);
  document.getElementById('sortBy').value  = 'relevance';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value   = '';
  const q = searchInput?.value.trim();
  if (q) doSearch(q, 0);
});

// ── Suggestions ───────────────────────────────────────────────
let suggestTimer;
const suggestionsDropdown = document.getElementById('suggestionsDropdown');

searchInput?.addEventListener('input', () => {
  clearTimeout(suggestTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { hideSuggestions(); return; }
  suggestTimer = setTimeout(() => loadSuggestions(q), 300);
});

async function loadSuggestions(q) {
  try {
    const suggestions = await search.getSuggestions(q);
    if (!suggestions?.length) { hideSuggestions(); return; }
    renderSuggestions(suggestions);
  } catch {
    hideSuggestions();
  }
}

function renderSuggestions(items) {
  if (!suggestionsDropdown) return;
  const list = Array.isArray(items) ? items : [];
  if (!list.length) { hideSuggestions(); return; }

  suggestionsDropdown.innerHTML = list.slice(0, 6).map(item => {
    const text = typeof item === 'string' ? item : (item.query || item.keyword || item.text || '');
    return `<div class="suggestion-item" data-query="${text}">
      <i class="fa-solid fa-magnifying-glass"></i>
      <span>${text}</span>
    </div>`;
  }).join('');

  suggestionsDropdown.classList.add('show');
  suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      const q = el.dataset.query;
      if (searchInput) searchInput.value = q;
      hideSuggestions();
      doSearch(q, 0);
    });
  });
}

function hideSuggestions() { suggestionsDropdown?.classList.remove('show'); }
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-bar-wrap')) hideSuggestions();
});

// ── Main Search Function ──────────────────────────────────────
async function doSearch(query, page = 0) {
  if (isSearching) return;
  isSearching = true;
  currentQuery = query;
  currentPage = page;

  // Update URL
  const url = new URL(window.location);
  url.searchParams.set('q', query);
  url.searchParams.set('page', page);
  window.history.replaceState({}, '', url);

  // Get filters
  const checkedTypes = [...document.querySelectorAll('.type-filter:checked')].map(c => c.value);
  const fileType     = checkedTypes.length === 1 ? checkedTypes[0] : null;
  const sortBy       = document.getElementById('sortBy')?.value || 'relevance';

  showLoader();
  const t0 = Date.now();

  try {
    const res = await search.search(query, page, 8, fileType, sortBy);
    const elapsed = Date.now() - t0;

    const results    = Array.isArray(res) ? res : (res?.content || []);
    const total      = res?.totalElements ?? results.length;
    const pages      = res?.totalPages ?? Math.ceil(total / 8);

    totalPages = pages;

    // Result meta
    document.getElementById('resultCount').innerHTML =
      `<i class="fa-solid fa-list" style="margin-right:.4rem;"></i>
      <strong>${total.toLocaleString()}</strong> result${total !== 1 ? 's' : ''} for
      <span style="color:var(--primary-end);">"${query}"</span>`;
    document.getElementById('searchTime').textContent = `${elapsed}ms`;

    renderResults(results, query);
    renderPagination(page, pages, query);
  } catch (err) {
    document.getElementById('resultsContainer').innerHTML = `
      <div class="empty-state" style="padding: 4rem 2rem;">
        <div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation" style="color:var(--danger);"></i></div>
        <h4>Search Failed</h4>
        <p>${err.message}</p>
        <button class="btn btn-primary btn-sm" onclick="doSearch('${query}', 0)">Retry</button>
      </div>`;
    showToast(err.message || 'Search failed', 'error');
  } finally {
    hideLoader();
    isSearching = false;
  }
}

// ── Render Results ────────────────────────────────────────────
function renderResults(results, query) {
  const container = document.getElementById('resultsContainer');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 4rem 2rem;">
        <div class="empty-state-icon"><i class="fa-solid fa-file-circle-question"></i></div>
        <h4>No Results Found</h4>
        <p>No documents match "<strong>${query}</strong>". Try different keywords, check spelling, or remove filters.</p>
        <div style="display:flex; gap:.75rem; justify-content:center; flex-wrap:wrap; margin-top:1rem;">
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('clearFilters').click()">
            <i class="fa-solid fa-filter-circle-xmark"></i> Clear Filters
          </button>
          <a href="upload.html" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-upload"></i> Upload Documents
          </a>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = results.map((doc, idx) => {
    const title   = doc.title || doc.name || 'Untitled Document';
    const snippet = doc.snippet || doc.content?.substring(0, 220) || doc.description || '';
    const score   = Math.round((doc.relevanceScore || doc.score || (1 - idx * 0.08)) * 100);
    const type    = doc.fileType || doc.type || '';

    return `
      <div class="result-card animate-fade-up" style="animation-delay:${idx * 0.05}s;">
        <div class="relevance-bar">
          <span>${score}%</span>
          <div class="relevance-track"><div class="relevance-fill" style="width:${score}%"></div></div>
        </div>
        <div class="result-title">
          ${getFileBadge(type)}
          <a href="preview.html?id=${doc.id}" style="color:inherit;">${highlightText(title, query)}</a>
        </div>
        <div class="result-meta">
          ${doc.uploadedBy || doc.uploader?.username ? `<span><i class="fa-solid fa-user"></i>${doc.uploadedBy || doc.uploader?.username}</span>` : ''}
          ${doc.uploadedAt || doc.createdAt ? `<span><i class="fa-regular fa-calendar"></i>${formatDate(doc.uploadedAt || doc.createdAt)}</span>` : ''}
          ${doc.fileSize || doc.size ? `<span><i class="fa-solid fa-weight-hanging"></i>${formatSize(doc.fileSize || doc.size)}</span>` : ''}
        </div>
        <div class="result-snippet">${highlightText(snippet, query) || '<em style="color:var(--text-dim)">No preview available</em>'}</div>
        <div class="result-actions">
          <a href="preview.html?id=${doc.id}" class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-eye"></i> Preview
          </a>
          <button class="btn btn-outline btn-sm" onclick="downloadDoc(${doc.id})">
            <i class="fa-solid fa-download"></i> Download
          </button>
          <button class="btn btn-secondary btn-sm" id="bm-${doc.id}" onclick="toggleBookmark(${doc.id}, this)">
            <i class="fa-regular fa-bookmark"></i> Bookmark
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination(current, total, query) {
  const pg = document.getElementById('pagination');
  if (!pg || total <= 1) { if (pg) pg.innerHTML = ''; return; }

  let html = '';
  html += `<button class="page-btn" onclick="doSearch('${query}', ${current - 1})" ${current === 0 ? 'disabled' : ''}>
    <i class="fa-solid fa-chevron-left"></i>
  </button>`;

  const range = [];
  for (let i = Math.max(0, current - 2); i <= Math.min(total - 1, current + 2); i++) range.push(i);

  if (range[0] > 0) {
    html += `<button class="page-btn" onclick="doSearch('${query}', 0)">1</button>`;
    if (range[0] > 1) html += `<span style="padding:.5rem;color:var(--text-dim)">…</span>`;
  }

  range.forEach(i => {
    html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="doSearch('${query}', ${i})">${i + 1}</button>`;
  });

  if (range[range.length - 1] < total - 1) {
    if (range[range.length - 1] < total - 2) html += `<span style="padding:.5rem;color:var(--text-dim)">…</span>`;
    html += `<button class="page-btn" onclick="doSearch('${query}', ${total - 1})">${total}</button>`;
  }

  html += `<button class="page-btn" onclick="doSearch('${query}', ${current + 1})" ${current === total - 1 ? 'disabled' : ''}>
    <i class="fa-solid fa-chevron-right"></i>
  </button>`;

  pg.innerHTML = html;
}

// ── Global Helpers ────────────────────────────────────────────
window.doSearch = doSearch;

window.downloadDoc = async (id) => {
  try {
    await documents.download(id);
  } catch (err) {
    showToast(err.message || 'Download failed', 'error');
  }
};

window.toggleBookmark = async (id, btn) => {
  try {
    const added = await bookmarks.toggle(id);
    btn.innerHTML = added
      ? '<i class="fa-solid fa-bookmark"></i> Bookmarked'
      : '<i class="fa-regular fa-bookmark"></i> Bookmark';
    btn.className = added ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    showToast(added ? 'Bookmarked!' : 'Bookmark removed', added ? 'success' : 'info');
  } catch (err) {
    showToast(err.message || 'Failed to toggle bookmark', 'error');
  }
};
