import {
  requireAuth, auth, users, bookmarks, history,
  showToast, hideLoader,
  initSidebar, initNavbar,
  formatDate, getInitials
} from './api.js';

requireAuth();
initSidebar();
initNavbar();
hideLoader();

let currentUser = null;

// ── Load Profile ──────────────────────────────────────────────
async function loadProfile() {
  try {
    currentUser = await users.getMe();
  } catch {
    // Fallback to localStorage
    currentUser = auth.getCurrentUser();
  }

  if (!currentUser) { auth.logout(); return; }

  // Render info
  const initials = getInitials(currentUser.fullName || currentUser.username);
  document.getElementById('profileAvatar').textContent  = initials;
  document.getElementById('profileName').textContent    = currentUser.fullName || currentUser.username;
  document.getElementById('profileUsername').textContent = `@${currentUser.username}`;
  document.getElementById('profileJoined').textContent  = formatDate(currentUser.createdAt || currentUser.joinedAt);
  document.getElementById('accountId').textContent      = `#${currentUser.id}`;
  document.getElementById('accountJoined').textContent  = formatDate(currentUser.createdAt || currentUser.joinedAt);

  const roleEl = document.getElementById('profileRoleBadge');
  const role   = (currentUser.role || 'USER').toUpperCase();
  roleEl.textContent = role;
  roleEl.className   = `role-badge ${role === 'ADMIN' ? 'role-admin' : 'role-user'}`;

  const roleAccount = document.getElementById('accountRole');
  if (roleAccount) roleAccount.innerHTML = `<span class="role-badge ${role === 'ADMIN' ? 'role-admin' : 'role-user'}">${role}</span>`;

  // Pre-fill form
  document.getElementById('editFullName').value = currentUser.fullName || '';
  document.getElementById('editEmail').value    = currentUser.email || '';
  document.getElementById('editUsername').value = currentUser.username || '';

  // Load stats
  loadStats();
}

// ── Load Stats ────────────────────────────────────────────────
async function loadStats() {
  try {
    const stats = await users.getStats();
    document.getElementById('statUploads').textContent   = stats.uploads ?? '—';
    document.getElementById('statSearchesP').textContent = stats.searches ?? '—';
    document.getElementById('statBm').textContent        = stats.bookmarks ?? '—';
  } catch {
    // Fallback: count from APIs
    try {
      const bm = await bookmarks.getAll();
      const arr = Array.isArray(bm) ? bm : (bm?.content || []);
      document.getElementById('statBm').textContent = arr.length;
    } catch {}

    try {
      const hist = await history.getAll();
      const arr = Array.isArray(hist) ? hist : (hist?.content || []);
      document.getElementById('statSearchesP').textContent = arr.length;
    } catch {}
  }
}

// ── Edit Profile Form ─────────────────────────────────────────
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('editFullName').value.trim();
  const email    = document.getElementById('editEmail').value.trim();
  const btn      = document.getElementById('saveProfileBtn');

  if (!fullName || !email) { showToast('Please fill in all fields', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner spinner-sm"></div> Saving...';

  try {
    const updated = await users.update({ fullName, email });
    // Update localStorage
    const stored = auth.getCurrentUser();
    localStorage.setItem('user', JSON.stringify({ ...stored, fullName, email }));
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileAvatar').textContent = getInitials(fullName);
    showToast('Profile updated successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update profile', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  }
});

// ── Change Password Form ──────────────────────────────────────
document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const current  = document.getElementById('currentPassword').value;
  const newPwd   = document.getElementById('newPassword').value;
  const confirm  = document.getElementById('confirmNewPassword').value;
  const btn      = document.getElementById('changePasswordBtn');

  if (!current || !newPwd) { showToast('Please fill in all password fields', 'error'); return; }
  if (newPwd.length < 8)   { showToast('New password must be at least 8 characters', 'error'); return; }
  if (newPwd !== confirm)  { showToast('New passwords do not match', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner spinner-sm"></div> Updating...';

  try {
    await users.changePassword(current, newPwd);
    document.getElementById('currentPassword').value  = '';
    document.getElementById('newPassword').value      = '';
    document.getElementById('confirmNewPassword').value = '';
    showToast('Password updated successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update password', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-key"></i> Update Password';
  }
});

// ── Expose auth for danger zone ───────────────────────────────
window.auth = auth;

loadProfile();
