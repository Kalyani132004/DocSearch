/* ============================================================
   api.js — Complete API Helper Module (FIXED)
   Document Search Engine Frontend
   ============================================================ */

const API_BASE = '/api';

// ── Auth Headers ──────────────────────────────────────────────
function getHeaders(isFormData = false) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  return headers;
}

// ── Generic Fetch Wrapper ─────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const isFormData = options.body instanceof FormData;

  const config = {
    ...options,
    headers: {
      ...getHeaders(isFormData),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return;
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType && (contentType.includes('application/octet-stream') || contentType.includes('application/pdf'))) {
      return response;
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Please check if the backend is running on port 8080.');
    }
    throw err;
  }
}

// ── Auth ──────────────────────────────────────────────────────
const auth = {
  async register(fullName, username, email, password, role = 'USER') {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, username, email, password, role }),
    });
  },


  async login(username, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data?.token) {
      localStorage.setItem('token', data.token);
      // AuthResponse is a flat record: { token, username, email, role, fullName, id }
      const user = {
        id:       data.id,
        username: data.username,
        email:    data.email,
        role:     data.role,
        fullName: data.fullName,
      };
      localStorage.setItem('user', JSON.stringify(user));
    }
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  },

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!localStorage.getItem('token');
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'admin';
  },
};

// ── Documents ─────────────────────────────────────────────────
const documents = {
  async upload(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = localStorage.getItem('token');

      xhr.open('POST', `${API_BASE}/documents/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { resolve(xhr.responseText); }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message || `Upload failed: ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  },

  async getAll(page = 0, size = 10) {
    return apiRequest(`/documents?page=${page}&size=${size}`);
  },

  async getMy(page = 0, size = 10) {
    return apiRequest(`/documents/my?page=${page}&size=${size}`);
  },

  async getById(id) {
    return apiRequest(`/documents/${id}`);
  },

  // FIX: backend route is /documents/download/{id}  (not /documents/{id}/download)
  async download(id) {
    const token = localStorage.getItem('token');
    const url = `${API_BASE}/documents/download/${id}`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const cd = response.headers.get('content-disposition');
    let filename = 'document';
    if (cd) {
      const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) filename = match[1].replace(/['"]/g, '');
    }
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 2000);
  },

  // Returns raw Response so caller can get content-type for preview
  async downloadRaw(id) {
    const url = `${API_BASE}/documents/download/${id}`;
    return fetch(url, { headers: getHeaders() });
  },

  async delete(id) {
    return apiRequest(`/documents/${id}`, { method: 'DELETE' });
  },
};

// ── Search ────────────────────────────────────────────────────
const search = {
  // FIX: backend expects ?q= not ?query=
  async search(query, page = 0, size = 10, fileType = null, sortBy = 'relevance') {
    let url = `/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}&sortBy=${sortBy}`;
    if (fileType) url += `&fileType=${fileType}`;
    const result = await apiRequest(url);
    // Save to history (fire and forget)
    try { history.add(query, result?.totalElements || 0); } catch {}
    return result;
  },

  // FIX: backend expects ?q= not ?query=
  async getSuggestions(query) {
    if (!query || query.length < 2) return [];
    try {
      return await apiRequest(`/search/suggestions?q=${encodeURIComponent(query)}`);
    } catch {
      return [];
    }
  },
};

// ── Bookmarks ─────────────────────────────────────────────────
const bookmarks = {
  // FIX: backend uses POST /bookmarks?documentId=X  (not /bookmarks/{id})
  async add(documentId) {
    return apiRequest(`/bookmarks?documentId=${documentId}`, { method: 'POST' });
  },

  async remove(documentId) {
    return apiRequest(`/bookmarks/${documentId}`, { method: 'DELETE' });
  },

  async getAll() {
    return apiRequest('/bookmarks');
  },

  // FIX: backend uses /bookmarks/check/{documentId}  (not /bookmarks/{id}/check)
  async check(documentId) {
    try {
      const res = await apiRequest(`/bookmarks/check/${documentId}`);
      // res is { bookmarked: true/false }
      return res?.bookmarked ?? false;
    } catch {
      return false;
    }
  },

  async toggle(documentId) {
    const isBookmarked = await this.check(documentId);
    if (isBookmarked) {
      await this.remove(documentId);
      return false;
    } else {
      await this.add(documentId);
      return true;
    }
  },
};

// ── Search History ────────────────────────────────────────────
const history = {
  // Now that backend has POST /history, this will actually save
  async add(query, resultCount = 0) {
    try {
      return await apiRequest('/history', {
        method: 'POST',
        body: JSON.stringify({ query, resultCount }),
      });
    } catch {}
  },

  async getAll() {
    return apiRequest('/history');
  },

  async clear() {
    return apiRequest('/history', { method: 'DELETE' });
  },

  async getKeywords() {
    try {
      return await apiRequest('/history/keywords');
    } catch {
      return [];
    }
  },
};

// ── Analytics ─────────────────────────────────────────────────
const analytics = {
  // Fetches /analytics and normalises field names for the frontend
  async get() {
    const raw = await apiRequest('/analytics');
    // Backend AnalyticsDTO fields → frontend expected fields
    return {
      totalDocuments:          raw.totalDocuments        ?? 0,
      totalUsers:              raw.totalUsers            ?? 0,
      totalSearches:           raw.totalSearches         ?? 0,
      documentsUploadedToday:  raw.uploadedToday         ?? 0,
      bookmarkedDocuments:     raw.bookmarkedDocuments   ?? 0,
      // documentsByType is Map<String,Long> e.g. {"PDF":95,"DOCX":72}
      fileTypeDistribution:    raw.documentsByType       ?? {},
      dailyUploads:            raw.dailyUploads          ?? [],
      // monthlyUploads entries: { month: "2025-01", count: 42 }
      // frontend expects { month: "Jan", count: 42 } — convert
      monthlyUploads: (raw.monthlyUploads || []).map(m => {
        const label = m.month ? new Date(m.month + '-01').toLocaleString('en-US', { month: 'short' }) : m.month;
        return { month: label, count: m.count };
      }),
      // Backend: topSearchKeywords[].keyword + .count
      // Frontend uses: topKeywords[].keyword + .count
      topKeywords: raw.topSearchKeywords ?? [],
    };
  },

  // Kept for compatibility — just delegates to get()
  async getDailyUploads() {
    try {
      const data = await this.get();
      return data.dailyUploads;
    } catch { return []; }
  },

  async getMonthlyUploads() {
    try {
      const data = await this.get();
      return data.monthlyUploads;
    } catch { return []; }
  },

  async getFileTypeDistribution() {
    try {
      const data = await this.get();
      return data.fileTypeDistribution;
    } catch { return {}; }
  },

  async getTopKeywords() {
    try {
      const data = await this.get();
      return data.topKeywords;
    } catch { return []; }
  },
};

// ── Users ─────────────────────────────────────────────────────
const users = {
  async getAll(page = 0, size = 20) {
    return apiRequest(`/users?page=${page}&size=${size}`);
  },

  async getMe() {
    return apiRequest('/users/me');
  },

  async update(data) {
    return apiRequest('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async changePassword(currentPassword, newPassword) {
    return apiRequest('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async delete(id) {
    return apiRequest(`/users/${id}`, { method: 'DELETE' });
  },

  async getStats() {
    try {
      return await apiRequest('/users/me/stats');
    } catch {
      return { uploads: 0, searches: 0, bookmarks: 0 };
    }
  },
};

// ── Auth Guards ───────────────────────────────────────────────
function requireAuth() {
  if (!auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  if (!auth.isAdmin()) {
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

// ── Toast Notifications ───────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info:    'fa-circle-info',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Loader ────────────────────────────────────────────────────
function showLoader() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('hidden');
}

function hideLoader() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.add('hidden');
}

// ── Utility Helpers ───────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const intervals = [
    { label: 'year',   secs: 31536000 },
    { label: 'month',  secs: 2592000  },
    { label: 'day',    secs: 86400    },
    { label: 'hour',   secs: 3600     },
    { label: 'minute', secs: 60       },
    { label: 'second', secs: 1        },
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(fileType) {
  if (!fileType) return 'fa-file';
  const t = fileType.toUpperCase();
  const map = {
    PDF:  'fa-file-pdf',
    DOCX: 'fa-file-word',
    DOC:  'fa-file-word',
    TXT:  'fa-file-lines',
    PPT:  'fa-file-powerpoint',
    PPTX: 'fa-file-powerpoint',
    XLS:  'fa-file-excel',
    XLSX: 'fa-file-excel',
    ZIP:  'fa-file-zipper',
    PNG:  'fa-file-image',
    JPG:  'fa-file-image',
    JPEG: 'fa-file-image',
  };
  return map[t] || 'fa-file';
}

function getFileIconColor(fileType) {
  if (!fileType) return '#94a3b8';
  const t = fileType.toUpperCase();
  const map = {
    PDF:  '#f87171',
    DOCX: '#60a5fa',
    DOC:  '#60a5fa',
    TXT:  '#94a3b8',
    PPT:  '#fbbf24',
    PPTX: '#fbbf24',
    XLS:  '#34d399',
    XLSX: '#34d399',
  };
  return map[t] || '#a855f7';
}

function getFileBadge(fileType) {
  if (!fileType) return '';
  const t = fileType.toUpperCase();
  const map = {
    PDF:  'badge-pdf',
    DOCX: 'badge-docx',
    DOC:  'badge-doc',
    TXT:  'badge-txt',
    PPT:  'badge-ppt',
    PPTX: 'badge-pptx',
    XLS:  'badge-xls',
    XLSX: 'badge-xlsx',
  };
  const cls = map[t] || 'badge-default';
  const icon = getFileIcon(t);
  return `<span class="file-badge ${cls}"><i class="fa-solid ${icon}"></i>${t}</span>`;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function highlightText(text, query) {
  if (!text || !query) return text || '';
  const words = query.trim().split(/\s+/).filter(Boolean);
  let result = text;
  words.forEach(word => {
    const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });
  return result;
}

// ── Sidebar Setup (shared across pages) ──────────────────────
function initSidebar() {
  const sidebar     = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const toggler     = document.getElementById('sidebarToggler');
  const overlay     = document.getElementById('sidebarOverlay');
  if (!sidebar) return;

  const isMobile = () => window.innerWidth <= 768;

  function toggleSidebar() {
    if (isMobile()) {
      sidebar.classList.toggle('mobile-open');
      overlay?.classList.toggle('show');
    } else {
      sidebar.classList.toggle('collapsed');
      mainContent?.classList.toggle('expanded');
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    }
  }

  // Restore state
  if (!isMobile() && localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed');
    mainContent?.classList.add('expanded');
  }

  toggler?.addEventListener('click', toggleSidebar);
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('show');
  });

  // Mark active link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link-item').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === path || href.endsWith('/' + path)) link.classList.add('active');
  });

  // User info in sidebar
  const user = auth.getCurrentUser();
  if (user) {
    const suName   = document.getElementById('sidebarUserName');
    const suRole   = document.getElementById('sidebarUserRole');
    const suAvatar = document.getElementById('sidebarAvatar');
    if (suName)   suName.textContent   = user.fullName || user.username;
    if (suRole)   suRole.textContent   = user.role;
    if (suAvatar) suAvatar.textContent = getInitials(user.fullName || user.username);

    // Show admin-only items
    if (auth.isAdmin()) {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    }
  }
}

// ── Navbar User Dropdown Setup ────────────────────────────────
function initNavbar() {
  const user = auth.getCurrentUser();
  if (!user) return;

  const navAvatar   = document.getElementById('navAvatar');
  const navUserName = document.getElementById('navUserName');
  const ddName      = document.getElementById('ddUserName');
  const ddEmail     = document.getElementById('ddUserEmail');
  const ddAvatar    = document.getElementById('ddAvatar');

  if (navAvatar)   navAvatar.textContent   = getInitials(user.fullName || user.username);
  if (navUserName) navUserName.textContent = (user.fullName || user.username).split(' ')[0];
  if (ddName)      ddName.textContent      = user.fullName || user.username;
  if (ddEmail)     ddEmail.textContent     = user.email;
  if (ddAvatar)    ddAvatar.textContent    = getInitials(user.fullName || user.username);

  // Admin items visibility
  if (auth.isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }

  // Dropdown toggle
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown  = document.getElementById('userDropdown');
  avatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle('show');
  });

  document.addEventListener('click', () => dropdown?.classList.remove('show'));

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => auth.logout());

  // -- Navbar Search Form --
  const navSearch = document.getElementById('navSearchInput');
  const navSuggBox = document.getElementById('navSuggestionsBox');
  let navDebounce;

  navSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && navSearch.value.trim()) {
      window.location.href = `results.html?q=${encodeURIComponent(navSearch.value.trim())}`;
    }
  });

  navSearch?.addEventListener('input', (e) => {
    clearTimeout(navDebounce);
    const q = e.target.value.trim();
    if (q.length < 2) {
      navSuggBox?.classList.remove('show');
      return;
    }
    navDebounce = setTimeout(async () => {
      try {
        const res = await search.getSuggestions(q);
        if (res && res.length > 0 && navSuggBox) {
          navSuggBox.innerHTML = res.map(s => `
            <div class="suggestion-item" onclick="window.location.href='results.html?q=${encodeURIComponent(s)}'">
              <i class="fa-solid fa-magnifying-glass"></i> ${s}
            </div>
          `).join('');
          navSuggBox.classList.add('show');
        } else {
          navSuggBox?.classList.remove('show');
        }
      } catch { navSuggBox?.classList.remove('show'); }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar-search')) navSuggBox?.classList.remove('show');
  });
}

export {
  API_BASE,
  auth,
  documents,
  search,
  bookmarks,
  history,
  analytics,
  users,
  requireAuth,
  requireAdmin,
  showToast,
  showLoader,
  hideLoader,
  formatDate,
  formatDateTime,
  timeAgo,
  formatSize,
  getFileIcon,
  getFileIconColor,
  getFileBadge,
  getInitials,
  highlightText,
  initSidebar,
  initNavbar,
};
