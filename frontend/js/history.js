import {
  requireAuth, history, showToast, hideLoader,
  initSidebar, initNavbar, timeAgo, formatDate
} from './api.js';

requireAuth();
initSidebar();
initNavbar();
hideLoader();

let historyData = [];

// ── Load History ──────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await history.getAll();
    historyData = Array.isArray(res) ? res : (res?.content || []);
    renderHistory(historyData);
    updateStats(historyData);
  } catch (err) {
    document.getElementById('historyTimeline').innerHTML = `
      <div class="empty-state" style="padding:3rem 1rem;">
        <div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation" style="color:var(--danger);"></i></div>
        <h4>Failed to load history</h4>
        <p>${err.message}</p>
      </div>`;
  }

  // Load keywords separately
  loadKeywords();
}

// ── Render History Timeline ───────────────────────────────────
function renderHistory(items) {
  const container = document.getElementById('historyTimeline');
  const countEl   = document.getElementById('historyCount');
  if (!container) return;

  if (countEl) countEl.textContent = `${items.length} search${items.length !== 1 ? 'es' : ''}`;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:3rem 1rem;">
        <div class="empty-state-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
        <h4>No Search History</h4>
        <p>Your search history will appear here after you search for documents.</p>
        <a href="results.html" class="btn btn-primary btn-sm">Start Searching</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="timeline">
      ${items.map((item, idx) => {
        const query = item.query || item.searchQuery || item.keyword || '';
        const count = item.resultCount ?? item.results ?? null;
        const time  = item.searchedAt || item.createdAt || item.timestamp;
        return `
          <div class="timeline-item" style="animation-delay:${idx * 0.04}s;">
            <div class="timeline-dot"></div>
            <div class="timeline-content" onclick="searchAgain('${escQ(query)}')">
              <div class="timeline-query">
                <i class="fa-solid fa-magnifying-glass" style="color:var(--primary-end); margin-right:.45rem; font-size:.85rem;"></i>
                ${escapeHtml(query)}
              </div>
              <div class="timeline-meta">
                ${count !== null ? `<span><i class="fa-solid fa-list"></i>${count} results</span>` : ''}
                <span><i class="fa-regular fa-clock"></i>${timeAgo(time)}</span>
                <span style="color:var(--text-dim); font-size:.72rem;">${formatDate(time)}</span>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ── Load Keyword Cloud ────────────────────────────────────────
async function loadKeywords() {
  const cloud = document.getElementById('keywordCloud');
  if (!cloud) return;

  try {
    let keywords = await history.getKeywords();
    if (!keywords?.length) {
      // Derive from history data
      keywords = historyData
        .map(h => ({ keyword: h.query || h.searchQuery || '', count: 1 }))
        .filter(k => k.keyword);
    }

    const list = Array.isArray(keywords) ? keywords.slice(0, 20) : [];

    if (!list.length) {
      cloud.innerHTML = `<p style="color:var(--text-dim); font-size:.85rem;">No keywords yet</p>`;
      return;
    }

    const maxCount = Math.max(...list.map(k => k.count || 1));

    cloud.innerHTML = list.map(k => {
      const text  = typeof k === 'string' ? k : (k.keyword || k.word || k.query || k);
      const count = k.count || 1;
      const size  = 0.75 + (count / maxCount) * 0.5;
      return `
        <span class="keyword-tag" style="font-size:${size}rem;" onclick="searchAgain('${escQ(text)}')">
          ${escapeHtml(text)}
          <span style="font-size:.68rem; opacity:.6;">${count}</span>
        </span>`;
    }).join('');
  } catch {
    cloud.innerHTML = `<p style="color:var(--text-dim); font-size:.85rem;">Failed to load keywords</p>`;
  }
}

// ── Stats ─────────────────────────────────────────────────────
function updateStats(items) {
  document.getElementById('totalSearchesStat').textContent = items.length;
  const unique = new Set(items.map(i => (i.query || i.searchQuery || '').toLowerCase())).size;
  document.getElementById('uniqueQueriesStat').textContent = unique;
}

// ── Clear History ─────────────────────────────────────────────
document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
  document.getElementById('confirmModal')?.classList.add('show');
});

document.getElementById('cancelClear')?.addEventListener('click', () => {
  document.getElementById('confirmModal')?.classList.remove('show');
});

document.getElementById('confirmClear')?.addEventListener('click', async () => {
  document.getElementById('confirmModal')?.classList.remove('show');
  try {
    await history.clear();
    historyData = [];
    renderHistory([]);
    document.getElementById('keywordCloud').innerHTML = `<p style="color:var(--text-dim); font-size:.85rem;">No keywords yet</p>`;
    updateStats([]);
    showToast('Search history cleared', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to clear history', 'error');
  }
});

// ── Search Again ──────────────────────────────────────────────
window.searchAgain = (query) => {
  window.location.href = `results.html?q=${encodeURIComponent(query)}`;
};

// ── Helpers ───────────────────────────────────────────────────
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escQ(text) {
  return String(text).replace(/'/g, "\\'");
}

loadHistory();
