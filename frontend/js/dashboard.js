import {
  auth, analytics, documents, bookmarks,
  requireAuth, showToast, hideLoader,
  initSidebar, initNavbar,
  formatDate, formatSize, getFileBadge, getInitials
} from './api.js';

requireAuth();
initSidebar();
initNavbar();

// Chart default options
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#334155';
Chart.defaults.font.family = 'Inter, sans-serif';

const chartCommon = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
    },
  },
};

let lineChart, barChart, doughnutChart, keywordsChart;
let analyticsData = null;

// ── Load Analytics ────────────────────────────────────────────
async function loadAnalytics() {
  try {
    analyticsData = await analytics.get();
  } catch {
    // fallback demo data
    analyticsData = {
      totalDocuments: 247,
      totalUsers: 38,
      totalSearches: 1842,
      documentsUploadedToday: 12,
      fileTypeDistribution: { PDF: 95, DOCX: 72, TXT: 48, PPT: 32 },
      dailyUploads: [
        { date: '2025-06-30', count: 8 },
        { date: '2025-07-01', count: 14 },
        { date: '2025-07-02', count: 6  },
        { date: '2025-07-03', count: 19 },
        { date: '2025-07-04', count: 11 },
        { date: '2025-07-05', count: 17 },
        { date: '2025-07-06', count: 12 },
      ],
      monthlyUploads: [
        { month: 'Jan', count: 42 }, { month: 'Feb', count: 58 },
        { month: 'Mar', count: 73 }, { month: 'Apr', count: 61 },
        { month: 'May', count: 88 }, { month: 'Jun', count: 95 },
        { month: 'Jul', count: 52 },
      ],
      topKeywords: [
        { keyword: 'machine learning', count: 142 },
        { keyword: 'data analysis', count: 118 },
        { keyword: 'research paper', count: 97 },
        { keyword: 'neural network', count: 84 },
        { keyword: 'deep learning', count: 76 },
      ],
    };
  }
  renderStats();
  renderCharts();
}

// ── Load Bookmarks Count ──────────────────────────────────────
async function loadBookmarksCount() {
  try {
    const bm = await bookmarks.getAll();
    const arr = Array.isArray(bm) ? bm : (bm?.content || []);
    document.getElementById('statBookmarks').textContent = arr.length;
  } catch {
    document.getElementById('statBookmarks').textContent = '0';
  }
}

// ── Render Stats ──────────────────────────────────────────────
function renderStats() {
  if (!analyticsData) return;
  animateCount('statDocs',      analyticsData.totalDocuments || 0);
  animateCount('statUsers',     analyticsData.totalUsers || 0);
  animateCount('statSearches',  analyticsData.totalSearches || 0);
  animateCount('statToday',     analyticsData.documentsUploadedToday || 0);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 1200;
  const start = Date.now();
  const tick = () => {
    const p = Math.min((Date.now() - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  tick();
}

// ── Render Charts ─────────────────────────────────────────────
function renderCharts() {
  renderLineChart();
  renderDoughnutChart();
  renderBarChart();
  renderKeywordsChart();
}

function renderLineChart(days = 7) {
  const data = (analyticsData?.dailyUploads || []).slice(-days);
  const labels = data.map(d => {
    const dt = new Date(d.date);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const values = data.map(d => d.count || 0);

  const ctx = document.getElementById('lineChart');
  if (!ctx) return;

  if (lineChart) lineChart.destroy();

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(168,85,247,.4)');
  gradient.addColorStop(1, 'rgba(168,85,247,.0)');

  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Uploads',
        data: values,
        borderColor: '#a855f7',
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: .4,
        pointBackgroundColor: '#a855f7',
        pointBorderColor: '#1e293b',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      ...chartCommon,
      scales: {
        x: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b', stepSize: 5 } },
      },
    },
  });
}

function renderDoughnutChart() {
  const dist = analyticsData?.fileTypeDistribution || {};
  const labels = Object.keys(dist);
  const values = Object.values(dist);
  const colors = ['#f87171', '#60a5fa', '#94a3b8', '#fbbf24', '#34d399', '#a855f7'];

  const ctx = document.getElementById('doughnutChart');
  if (!ctx) return;
  if (doughnutChart) doughnutChart.destroy();

  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: '#1e293b',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      ...chartCommon,
      cutout: '70%',
      plugins: {
        ...chartCommon.plugins,
        legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 14, font: { size: 11 } } },
      },
    },
  });
}

function renderBarChart() {
  const monthly = analyticsData?.monthlyUploads || [];
  const labels = monthly.map(m => m.month);
  const values = monthly.map(m => m.count || 0);

  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Uploads',
        data: values,
        backgroundColor: 'rgba(124,58,237,.7)',
        borderColor: '#7c3aed',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      ...chartCommon,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } },
      },
    },
  });
}

function renderKeywordsChart() {
  const kw = (analyticsData?.topKeywords || []).slice(0, 5);
  const labels = kw.map(k => k.keyword || k.word || k.query || '');
  const values = kw.map(k => k.count || k.frequency || 0);

  const ctx = document.getElementById('keywordsChart');
  if (!ctx) return;
  if (keywordsChart) keywordsChart.destroy();

  const colors = ['rgba(168,85,247,.8)', 'rgba(6,182,212,.8)', 'rgba(16,185,129,.8)', 'rgba(245,158,11,.8)', 'rgba(239,68,68,.8)'];

  keywordsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Searches',
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      ...chartCommon,
      indexAxis: 'y',
      scales: {
        x: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      },
    },
  });
}

// ── Load Recent Docs ──────────────────────────────────────────
async function loadRecentDocs() {
  const tbody = document.getElementById('recentDocsBody');
  if (!tbody) return;

  try {
    const res = await documents.getAll(0, 5);
    const docs = Array.isArray(res) ? res : (res?.content || []);

    if (!docs.length) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state" style="padding:2rem">
          <div class="empty-state-icon"><i class="fa-solid fa-file-circle-xmark"></i></div>
          <h4>No documents yet</h4>
          <p>Upload your first document to get started</p>
          <a href="upload.html" class="btn btn-primary btn-sm">Upload Now</a>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = docs.map(doc => `
      <tr>
        <td>
          <div class="doc-title-cell" title="${doc.title || doc.name || 'Untitled'}">${doc.title || doc.name || 'Untitled'}</div>
        </td>
        <td>${getFileBadge(doc.fileType || doc.type)}</td>
        <td>${formatSize(doc.fileSize || doc.size)}</td>
        <td>${doc.uploadedBy || doc.uploader?.username || doc.username || '—'}</td>
        <td>${formatDate(doc.uploadedAt || doc.createdAt)}</td>
        <td>
          <div style="display:flex; gap:.4rem;">
            <a href="preview.html?id=${doc.id}" class="btn btn-secondary btn-sm btn-icon" title="Preview">
              <i class="fa-solid fa-eye"></i>
            </a>
            <button class="btn btn-outline btn-sm btn-icon" title="Download" onclick="downloadDoc(${doc.id})">
              <i class="fa-solid fa-download"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:2rem;">
      Failed to load documents
    </td></tr>`;
  }
}

// ── Quick Search ──────────────────────────────────────────────
function setupQuickSearch() {
  const input = document.getElementById('quickSearch');
  const btn   = document.getElementById('quickSearchBtn');

  const go = () => {
    const q = input?.value.trim();
    if (q) window.location.href = `results.html?q=${encodeURIComponent(q)}`;
  };

  btn?.addEventListener('click', go);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

// ── Chart Period Toggle ───────────────────────────────────────
document.getElementById('chartWeekBtn')?.addEventListener('click', () => renderLineChart(7));
document.getElementById('chartMonthBtn')?.addEventListener('click', () => renderLineChart(30));

// ── Download helper (global) ──────────────────────────────────
window.downloadDoc = async (id) => {
  try {
    await documents.download(id);
    showToast('Download started!', 'success');
  } catch (err) {
    showToast(err.message || 'Download failed', 'error');
  }
};

// ── Init ────
(async () => {
  hideLoader();
  await Promise.all([
    loadAnalytics(),
    loadRecentDocs(),
    loadBookmarksCount(),
  ]);
  setupQuickSearch();

  // Animate stat cards on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.style.animation = 'fadeInUp .4s ease both';
    });
  }, { threshold: .1 });
  document.querySelectorAll('.stat-card').forEach(el => observer.observe(el));
})();
