import {
  auth, analytics, documents, users, history,
  requireAdmin, showToast, hideLoader,
  initSidebar, initNavbar,
  formatDate, formatSize, getFileBadge, getInitials
} from './api.js';

requireAdmin();
initSidebar();
initNavbar();

// ── Chart defaults ────────────────────────────────────────────
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#334155';
Chart.defaults.font.family = 'Inter, sans-serif';

const cc = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
    tooltip: {
      backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1,
      titleColor: '#f1f5f9', bodyColor: '#94a3b8',
    },
  },
};

// ── State ─────────────────────────────────────────────────────
let usersPage = 0, docsPage = 0;
let allUsers = [], allDocs = [];
let pendingDeleteFn = null;
let adminData = null;

// ── Tab Switching ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`tab-${btn.dataset.tab}`);
    if (panel) panel.classList.add('active');
    if (btn.dataset.tab === 'charts') renderCharts();
    if (btn.dataset.tab === 'searches') loadSearchLogs();
  });
});

// ── System Stats ──────────────────────────────────────────────
async function loadSystemStats() {
  try {
    adminData = await analytics.get();
    animateVal('sysTotalUsers',    adminData.totalUsers || 0);
    animateVal('sysTotalDocs',     adminData.totalDocuments || 0);
    animateVal('sysTotalSearches', adminData.totalSearches || 0);
    animateVal('sysUploadsToday',  adminData.documentsUploadedToday || 0);
  } catch {
    // demo data fallback
    adminData = {
      totalUsers: 38, totalDocuments: 247, totalSearches: 1842, documentsUploadedToday: 12,
      fileTypeDistribution: { PDF: 95, DOCX: 72, TXT: 48, PPT: 32 },
      dailyUploads: [
        { date: '2025-07-01', count: 14 }, { date: '2025-07-02', count: 6 },
        { date: '2025-07-03', count: 19 }, { date: '2025-07-04', count: 11 },
        { date: '2025-07-05', count: 17 }, { date: '2025-07-06', count: 12 },
        { date: '2025-07-07', count: 8 },
      ],
      monthlyUploads: [
        { month: 'Jan', count: 42 }, { month: 'Feb', count: 58 }, { month: 'Mar', count: 73 },
        { month: 'Apr', count: 61 }, { month: 'May', count: 88 }, { month: 'Jun', count: 95 },
        { month: 'Jul', count: 52 },
      ],
      topKeywords: [
        { keyword: 'machine learning', count: 142 }, { keyword: 'data analysis', count: 118 },
        { keyword: 'research', count: 97 }, { keyword: 'neural network', count: 84 },
        { keyword: 'deep learning', count: 76 },
      ],
    };
    animateVal('sysTotalUsers',    adminData.totalUsers);
    animateVal('sysTotalDocs',     adminData.totalDocuments);
    animateVal('sysTotalSearches', adminData.totalSearches);
    animateVal('sysUploadsToday',  adminData.documentsUploadedToday);
  }
}

function animateVal(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 1000, start = Date.now();
  const tick = () => {
    const p = Math.min((Date.now() - start) / dur, 1);
    el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  tick();
}

// ── Users Tab ─────────────────────────────────────────────────
async function loadUsers(page = 0) {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-dim);">
    <div class="spinner spinner-sm" style="margin:0 auto .5rem;"></div>Loading...</td></tr>`;
  try {
    const res = await users.getAll(page, 10);
    allUsers = Array.isArray(res) ? res : (res?.content || []);
    renderUsersTable(allUsers);

    // pagination
    const total = res?.totalPages || 1;
    renderPagination('usersPagination', page, total, p => { usersPage = p; loadUsers(p); });
  } catch (err) {
    // Fallback demo users
    allUsers = [
      { id: 1, fullName: 'Admin User', username: 'admin', email: 'admin@docsearch.com', role: 'ADMIN', createdAt: new Date().toISOString() },
      { id: 2, fullName: 'John Doe', username: 'johndoe', email: 'john@example.com', role: 'USER', createdAt: new Date().toISOString() },
      { id: 3, fullName: 'Jane Smith', username: 'janesmith', email: 'jane@example.com', role: 'USER', createdAt: new Date().toISOString() },
    ];
    renderUsersTable(allUsers);
  }
}

function renderUsersTable(list) {
  const tbody = document.getElementById('usersTableBody');
  const currentUserId = auth.getCurrentUser()?.id;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:2rem;">
      <div class="empty-state-icon"><i class="fa-solid fa-users-slash"></i></div>
      <h4>No users found</h4></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.65rem;">
          <div class="user-avatar-sm">${getInitials(u.fullName || u.username)}</div>
          <span>${u.fullName || '—'}</span>
        </div>
      </td>
      <td><code style="font-size:.8rem;color:var(--text-dim);">@${u.username}</code></td>
      <td>${u.email}</td>
      <td><span class="role-badge ${(u.role || '').toLowerCase()}">${u.role || 'USER'}</span></td>
      <td>${formatDate(u.createdAt)}</td>
      <td>
        <div style="display:flex;gap:.4rem;">
          ${u.id !== currentUserId ? `
            <button class="btn btn-danger btn-sm btn-icon" title="Delete User"
              onclick="confirmDelete('user', ${u.id}, '${(u.fullName || u.username).replace(/'/g, '')}')">
              <i class="fa-solid fa-trash"></i>
            </button>` : `<span style="font-size:.75rem;color:var(--text-dim);">You</span>`}
        </div>
      </td>
    </tr>`).join('');
}

// User search filter
document.getElementById('userSearchInput').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const filtered = allUsers.filter(u =>
    (u.fullName || '').toLowerCase().includes(q) ||
    (u.username || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  );
  renderUsersTable(filtered);
});

document.getElementById('refreshUsersBtn').addEventListener('click', () => loadUsers(usersPage));

// ── Documents Tab ─────────────────────────────────────────────
async function loadDocs(page = 0) {
  const tbody = document.getElementById('docsTableBody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-dim);">
    <div class="spinner spinner-sm" style="margin:0 auto .5rem;"></div>Loading...</td></tr>`;
  try {
    const res = await documents.getAll(page, 10);
    allDocs = Array.isArray(res) ? res : (res?.content || []);
    renderDocsTable(allDocs);

    const total = res?.totalPages || 1;
    renderPagination('docsPagination', page, total, p => { docsPage = p; loadDocs(p); });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-dim);">
      <i class="fa-solid fa-triangle-exclamation" style="margin-right:.5rem;"></i>
      Failed to load documents. Make sure the backend is running.
    </td></tr>`;
  }
}

function renderDocsTable(list) {
  const tbody = document.getElementById('docsTableBody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:2rem;">
      <div class="empty-state-icon"><i class="fa-solid fa-file-circle-xmark"></i></div>
      <h4>No documents found</h4>
      <a href="upload.html" class="btn btn-primary btn-sm">Upload Now</a>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(doc => `
    <tr>
      <td>
        <div class="doc-title-cell" title="${doc.title || doc.name || 'Untitled'}">
          ${doc.title || doc.name || 'Untitled'}
        </div>
      </td>
      <td>${getFileBadge(doc.fileType || doc.type)}</td>
      <td>${formatSize(doc.fileSize || doc.size)}</td>
      <td>${doc.uploadedBy || doc.uploader?.username || '—'}</td>
      <td>${formatDate(doc.uploadedAt || doc.createdAt)}</td>
      <td>
        <div style="display:flex;gap:.4rem;">
          <a href="preview.html?id=${doc.id}" class="btn btn-secondary btn-sm btn-icon" title="Preview">
            <i class="fa-solid fa-eye"></i>
          </a>
          <button class="btn btn-danger btn-sm btn-icon" title="Delete"
            onclick="confirmDelete('doc', ${doc.id}, '${(doc.title || 'this document').replace(/'/g, '')}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

// Doc search + type filter
function applyDocFilters() {
  const q   = document.getElementById('docSearchInput').value.toLowerCase();
  const typ = document.getElementById('docTypeFilter').value.toUpperCase();
  const filtered = allDocs.filter(d => {
    const titleMatch = (d.title || d.name || '').toLowerCase().includes(q);
    const typeMatch  = !typ || (d.fileType || d.type || '').toUpperCase() === typ;
    return titleMatch && typeMatch;
  });
  renderDocsTable(filtered);
}
document.getElementById('docSearchInput').addEventListener('input', applyDocFilters);
document.getElementById('docTypeFilter').addEventListener('change', applyDocFilters);
document.getElementById('refreshDocsBtn').addEventListener('click', () => loadDocs(docsPage));

// ── Search Logs Tab ───────────────────────────────────────────
async function loadSearchLogs() {
  const tbody = document.getElementById('searchLogsBody');
  try {
    const res = await history.getAll();
    const logs = Array.isArray(res) ? res : (res?.content || []);
    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state" style="padding:2rem;">
        <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass-minus"></i></div>
        <h4>No search logs yet</h4></div></td></tr>`;
      return;
    }
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td><span class="search-tag" style="color:var(--text-primary);">${l.query || '—'}</span></td>
        <td><span style="color:var(--success);">${l.resultCount || 0} results</span></td>
        <td>${formatDate(l.searchedAt || l.createdAt)}</td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-dim);">
      Could not load search logs.</td></tr>`;
  }
}

// ── Charts Tab ────────────────────────────────────────────────
let adminLineChart, adminDoughnut, adminKeywords, adminBarChart;

function renderCharts() {
  if (!adminData) return;
  renderAdminLine();
  renderAdminDoughnut();
  renderAdminKeywords();
  renderAdminBar();
}

function renderAdminLine() {
  const data = adminData?.dailyUploads || [];
  const labels = data.map(d => {
    const dt = new Date(d.date);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const values = data.map(d => d.count || 0);
  const ctx = document.getElementById('adminLineChart');
  if (!ctx) return;
  if (adminLineChart) adminLineChart.destroy();
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 270);
  gradient.addColorStop(0, 'rgba(168,85,247,.4)');
  gradient.addColorStop(1, 'rgba(168,85,247,0)');
  adminLineChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Uploads', data: values, borderColor: '#a855f7', backgroundColor: gradient, borderWidth: 2.5, fill: true, tension: .4, pointBackgroundColor: '#a855f7', pointBorderColor: '#1e293b', pointBorderWidth: 2, pointRadius: 5 }] },
    options: { ...cc, scales: { x: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } } } },
  });
}

function renderAdminDoughnut() {
  const dist = adminData?.fileTypeDistribution || {};
  const labels = Object.keys(dist);
  const values = Object.values(dist);
  const colors = ['#f87171','#60a5fa','#94a3b8','#fbbf24','#34d399','#a855f7'];
  const ctx = document.getElementById('adminDoughnut');
  if (!ctx) return;
  if (adminDoughnut) adminDoughnut.destroy();
  adminDoughnut = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderColor: '#1e293b', borderWidth: 3, hoverOffset: 8 }] },
    options: { ...cc, cutout: '70%', plugins: { ...cc.plugins, legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, font: { size: 11 } } } } },
  });
}

function renderAdminKeywords() {
  const kw = (adminData?.topKeywords || []).slice(0, 5);
  const labels = kw.map(k => k.keyword || k.query || '');
  const values = kw.map(k => k.count || k.frequency || 0);
  const colors = ['rgba(168,85,247,.8)','rgba(6,182,212,.8)','rgba(16,185,129,.8)','rgba(245,158,11,.8)','rgba(239,68,68,.8)'];
  const ctx = document.getElementById('adminKeywords');
  if (!ctx) return;
  if (adminKeywords) adminKeywords.destroy();
  adminKeywords = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Searches', data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
    options: { ...cc, indexAxis: 'y', scales: { x: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } }, y: { grid: { display: false }, ticks: { color: '#94a3b8' } } } },
  });
}

function renderAdminBar() {
  const monthly = adminData?.monthlyUploads || [];
  const labels = monthly.map(m => m.month);
  const values = monthly.map(m => m.count || 0);
  const ctx = document.getElementById('adminBarChart');
  if (!ctx) return;
  if (adminBarChart) adminBarChart.destroy();
  adminBarChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Uploads', data: values, backgroundColor: 'rgba(124,58,237,.7)', borderColor: '#7c3aed', borderWidth: 1, borderRadius: 6, borderSkipped: false }] },
    options: { ...cc, scales: { x: { grid: { display: false }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } } } },
  });
}

// ── Pagination Helper ─────────────────────────────────────────
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }

  let html = '';
  for (let i = 0; i < totalPages; i++) {
    html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}"
      onclick="(${onPageChange.toString()})(${i})">${i + 1}</button>`;
  }
  container.innerHTML = html;
}

// ── Confirm Delete Modal ──────────────────────────────────────
window.confirmDelete = function(type, id, name) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent = `Delete ${type === 'user' ? 'User' : 'Document'}?`;
  document.getElementById('confirmMessage').textContent =
    `Are you sure you want to delete "${name}"? This action cannot be undone.`;
  modal.classList.add('show');

  pendingDeleteFn = async () => {
    try {
      if (type === 'user') {
        await users.delete(id);
        showToast('User deleted successfully', 'success');
        loadUsers(usersPage);
      } else {
        await documents.delete(id);
        showToast('Document deleted successfully', 'success');
        loadDocs(docsPage);
      }
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
    modal.classList.remove('show');
  };
};

document.getElementById('confirmOk').addEventListener('click', () => {
  if (pendingDeleteFn) pendingDeleteFn();
});
document.getElementById('confirmCancel').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('show');
  pendingDeleteFn = null;
});

// ── Init ──────────────────────────────────────────────────────
(async () => {
  hideLoader();
  await loadSystemStats();
  await Promise.all([loadUsers(), loadDocs()]);
})();
