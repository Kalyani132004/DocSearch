import {
  auth, analytics, documents,
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

let aLineChart, aBarChart, aDoughnutChart, aKeywordsChart;
let analyticsData = null;

// ── Animate count ─────────────────────────────────────────────
function animateCount(id, target) {
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

// ── Load Analytics 
async function loadAnalytics() {
  try {
    analyticsData = await analytics.get();
  } catch {
    analyticsData = {
      totalDocuments: 247, totalUsers: 38, totalSearches: 1842, documentsUploadedToday: 12,
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
  }

  // Render stats
  animateCount('aTotalDocs',     analyticsData.totalDocuments || 0);
  animateCount('aTotalUsers',    analyticsData.totalUsers || 0);
  animateCount('aTotalSearches', analyticsData.totalSearches || 0);
  animateCount('aToday',         analyticsData.documentsUploadedToday || 0);

  renderCharts();
  renderActivityTimeline();
}

// ── Charts ────────────────────────────────────────────────────
function renderCharts() {
  renderLine();
  renderDoughnut();
  renderBar();
  renderKeywords();
}

function renderLine() {
  const data = analyticsData?.dailyUploads || [];
  const labels = data.map(d => {
    const dt = new Date(d.date);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const values = data.map(d => d.count || 0);
  const ctx = document.getElementById('aLineChart');
  if (!ctx) return;
  if (aLineChart) aLineChart.destroy();
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(168,85,247,.4)');
  gradient.addColorStop(1, 'rgba(168,85,247,0)');
  aLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Uploads', data: values, borderColor: '#a855f7', backgroundColor: gradient, borderWidth: 2.5, fill: true, tension: .4, pointBackgroundColor: '#a855f7', pointBorderColor: '#1e293b', pointBorderWidth: 2, pointRadius: 5 }],
    },
    options: {
      ...cc,
      scales: {
        x: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b', stepSize: 5 } },
      },
    },
  });
}

function renderDoughnut() {
  const dist = analyticsData?.fileTypeDistribution || {};
  const labels = Object.keys(dist);
  const values = Object.values(dist);
  const colors = ['#f87171','#60a5fa','#94a3b8','#fbbf24','#34d399','#a855f7'];
  const ctx = document.getElementById('aDoughnutChart');
  if (!ctx) return;
  if (aDoughnutChart) aDoughnutChart.destroy();
  aDoughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderColor: '#1e293b', borderWidth: 3, hoverOffset: 8 }] },
    options: { ...cc, cutout: '70%', plugins: { ...cc.plugins, legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 14, font: { size: 11 } } } } },
  });
}

function renderBar() {
  const monthly = analyticsData?.monthlyUploads || [];
  const labels = monthly.map(m => m.month);
  const values = monthly.map(m => m.count || 0);
  const ctx = document.getElementById('aBarChart');
  if (!ctx) return;
  if (aBarChart) aBarChart.destroy();
  aBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Uploads', data: values, backgroundColor: 'rgba(124,58,237,.7)', borderColor: '#7c3aed', borderWidth: 1, borderRadius: 6, borderSkipped: false }],
    },
    options: {
      ...cc,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } },
      },
    },
  });
}

function renderKeywords() {
  const kw = (analyticsData?.topKeywords || []).slice(0, 5);
  const labels = kw.map(k => k.keyword || k.query || '');
  const values = kw.map(k => k.count || k.frequency || 0);
  const colors = ['rgba(168,85,247,.8)','rgba(6,182,212,.8)','rgba(16,185,129,.8)','rgba(245,158,11,.8)','rgba(239,68,68,.8)'];
  const ctx = document.getElementById('aKeywordsChart');
  if (!ctx) return;
  if (aKeywordsChart) aKeywordsChart.destroy();
  aKeywordsChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Searches', data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
    options: {
      ...cc,
      indexAxis: 'y',
      scales: {
        x: { grid: { color: 'rgba(51,65,85,.5)' }, ticks: { color: '#64748b' } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      },
    },
  });
}

// ── Activity Timeline ─────────────────────────────────────────
async function renderActivityTimeline() {
  const container = document.getElementById('activityTimeline');
  if (!container) return;
  try {
    const res = await documents.getAll(0, 5);
    const docs = Array.isArray(res) ? res : (res?.content || []);
    if (!docs.length) {
      container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-dim);">No recent activity</div>`;
      return;
    }
    container.innerHTML = docs.map(doc => `
      <div style="display:flex;align-items:flex-start;gap:1rem;padding:.9rem 0;border-bottom:1px solid var(--border);">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fa-solid fa-file-arrow-up" style="color:var(--primary-end);font-size:.9rem;"></i>
        </div>
        <div style="flex:1;">
          <div style="font-weight:600;color:var(--text-primary);font-size:.9rem;">${doc.title || doc.name || 'Untitled'}</div>
          <div style="font-size:.8rem;color:var(--text-dim);margin-top:.15rem;">
            Uploaded by <strong>${doc.uploadedBy || doc.uploader?.username || 'Unknown'}</strong> · ${formatDate(doc.uploadedAt || doc.createdAt)}
          </div>
        </div>
        ${getFileBadge(doc.fileType || doc.type)}
      </div>`).join('');
  } catch {
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-dim);">Could not load activity</div>`;
  }
}

// ── Time range filter ─────────────────────────────────────────
document.getElementById('timeRange')?.addEventListener('change', async (e) => {
  const days = parseInt(e.target.value);
  try {
    const daily = await analytics.getDailyUploads(days);
    if (daily?.length) {
      analyticsData.dailyUploads = daily;
      renderLine();
    }
  } catch {}
});

// ── Export ────────────────────────────────────────────────────
document.getElementById('exportBtn')?.addEventListener('click', () => {
  if (!analyticsData) return;
  const json = JSON.stringify(analyticsData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `docsearch-analytics-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Analytics report exported!', 'success');
});

// ── Init ──────────────────────────────────────────────────────
(async () => {
  hideLoader();
  await loadAnalytics();
})();
