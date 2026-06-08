/* ===================== CONFIG ===================== */
let SUPABASE_URL = localStorage.getItem('sb_url') || '';
let SUPABASE_KEY = localStorage.getItem('sb_key') || '';
const TABLE = 'jobs';

/* ===================== STATE ===================== */
let allJobs = [];
let editingId = null;
let activeFilter = 'all';

/* ===================== INIT ===================== */
document.addEventListener('DOMContentLoaded', () => {
  setupStatCards();
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    showState('no-config');
  } else {
    loadJobs();
  }
  // default today
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
});

/* ===================== SUPABASE API ===================== */
async function sbFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  // ใช้ user JWT (จาก Supabase Auth) เพื่อให้ RLS ทำงานถูกต้อง
  const authToken = window.__sbToken || localStorage.getItem('sb_access_token') || SUPABASE_KEY;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ===================== LOAD ===================== */
async function loadJobs() {
  showState('loading');
  try {
    const data = await sbFetch(`${TABLE}?select=*&order=created_at.desc`);
    allJobs = data || [];
    renderAll();
  } catch (e) {
    console.error(e);
    if (e.message.includes('relation') || e.message.includes('does not exist')) {
      showToast('❌ ไม่พบตาราง "jobs" — ดู README เพื่อสร้าง table', 'error');
    } else {
      showToast('❌ เชื่อมต่อ Supabase ไม่ได้: ' + e.message, 'error');
    }
    showState('empty-jobs');
  }
}

/* ===================== SAVE JOB ===================== */
async function saveJob() {
  const company  = document.getElementById('f-company').value.trim();
  const position = document.getElementById('f-position').value.trim();
  if (!company || !position) { showToast('⚠️ กรุณากรอกชื่อบริษัทและตำแหน่ง', 'warn'); return; }

  const payload = {
    company,
    position,
    url:      document.getElementById('f-url').value.trim(),
    source:   document.getElementById('f-source').value,
    status:   document.getElementById('f-status').value,
    salary:   document.getElementById('f-salary').value.trim(),
    location: document.getElementById('f-location').value.trim(),
    commute:  document.getElementById('f-commute').value.trim(),
    applied_date: document.getElementById('f-date').value || null,
    notes:    document.getElementById('f-notes').value.trim(),
  };

  try {
    if (editingId) {
      await sbFetch(`${TABLE}?id=eq.${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      showToast('✅ อัปเดตข้อมูลเรียบร้อย');
    } else {
      await sbFetch(TABLE, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('✅ เพิ่มงานเรียบร้อย');
    }
    closeModal();
    loadJobs();
  } catch (e) {
    showToast('❌ บันทึกไม่สำเร็จ: ' + e.message, 'error');
  }
}

/* ===================== DELETE JOB ===================== */
async function deleteJob(id) {
  if (!confirm('ลบรายการนี้?')) return;
  try {
    await sbFetch(`${TABLE}?id=eq.${id}`, { method: 'DELETE' });
    showToast('🗑️ ลบเรียบร้อย');
    loadJobs();
  } catch (e) {
    showToast('❌ ลบไม่สำเร็จ: ' + e.message, 'error');
  }
}

/* ===================== RENDER ===================== */
function renderAll() {
  updateStats();
  filterJobs();
}

function filterJobs() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const srcFilter = document.getElementById('filter-source').value;
  const stFilter = document.getElementById('filter-status').value;

  let filtered = allJobs.filter(j => {
    const matchStatus = activeFilter === 'all' || j.status === activeFilter;
    const matchSearch = !search || 
      (j.company || '').toLowerCase().includes(search) ||
      (j.position || '').toLowerCase().includes(search);
    const matchSrc = !srcFilter || j.source === srcFilter;
    const matchSt = !stFilter || j.status === stFilter;
    return matchStatus && matchSearch && matchSrc && matchSt;
  });

  renderTable(filtered);
  document.getElementById('result-count').textContent =
    filtered.length !== allJobs.length
      ? `แสดง ${filtered.length} จาก ${allJobs.length}`
      : `${allJobs.length} รายการ`;
}

function renderTable(jobs) {
  const tbody = document.getElementById('job-tbody');

  if (jobs.length === 0) {
    if (allJobs.length === 0) {
      showState('empty-jobs');
    } else {
      document.getElementById('job-table').classList.add('hidden');
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('no-config').classList.add('hidden');
      document.getElementById('empty-jobs').classList.remove('hidden');
    }
    return;
  }

  showState('table');
  tbody.innerHTML = jobs.map((j, i) => `
    <tr>
      <td class="row-num">${i + 1}</td>
      <td>
        <div class="company-name">
          ${escHtml(j.company)}
          ${j.url ? `<a href="${escHtml(j.url)}" target="_blank" rel="noopener">🔗</a>` : ''}
        </div>
        <div class="position-name">${escHtml(j.position)}</div>
      </td>
      <td>${sourceBadge(j.source)}</td>
      <td>${statusBadge(j.status)}</td>
      <td>
        <div class="location-text">${escHtml(j.location || '—')}</div>
        ${j.commute ? `<div style="font-size:.75rem;color:var(--text3)">${escHtml(j.commute)}</div>` : ''}
      </td>
      <td class="salary-text">${escHtml(j.salary || '—')}</td>
      <td class="date-text">${formatDate(j.applied_date)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="openEditModal(${j.id})">แก้ไข</button>
          <button class="btn-delete" onclick="deleteJob(${j.id})">ลบ</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ===================== STATS ===================== */
function updateStats() {
  document.getElementById('s-total').textContent = allJobs.length;
  document.getElementById('s-applied').textContent = allJobs.filter(j => j.status === 'Applied').length;
  document.getElementById('s-interviewing').textContent = allJobs.filter(j => j.status === 'Interviewing').length;
  document.getElementById('s-offered').textContent = allJobs.filter(j => j.status === 'Offered').length;
  document.getElementById('s-rejected').textContent = allJobs.filter(j => j.status === 'Rejected').length;
}

function setupStatCards() {
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      activeFilter = card.dataset.filter;
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      filterJobs();
    });
  });
  document.querySelector('[data-filter="all"]').classList.add('active');
}

/* ===================== HELPERS ===================== */
function statusBadge(status) {
  const cls = { Applied: 'badge-applied', Interviewing: 'badge-interviewing',
    Offered: 'badge-offered', Rejected: 'badge-rejected', Withdrawn: 'badge-withdrawn' };
  return `<span class="badge ${cls[status] || ''}">${status || '—'}</span>`;
}

function sourceBadge(src) {
  if (!src) return '<span class="source-badge src-default">—</span>';
  const cls = {
    'Jobsdb': 'src-jobsdb', 'JobThai': 'src-jobthai',
    'Jobtopgun': 'src-jobtopgun', 'LinkedIn': 'src-linkedin', 'Facebook': 'src-facebook'
  };
  return `<span class="source-badge ${cls[src] || 'src-default'}">${src}</span>`;
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

function showState(state) {
  ['loading', 'no-config', 'empty-jobs', 'job-table'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(state).classList.remove('hidden');
}

/* ===================== MODAL ===================== */
function openAddModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = '➕ เพิ่มงานใหม่';
  clearForm();
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('job-modal').classList.remove('hidden');
}

function openEditModal(id) {
  const job = allJobs.find(j => j.id === id);
  if (!job) return;
  editingId = id;
  document.getElementById('modal-title').textContent = '✏️ แก้ไขข้อมูลงาน';
  document.getElementById('f-company').value  = job.company || '';
  document.getElementById('f-position').value = job.position || '';
  document.getElementById('f-url').value      = job.url || '';
  document.getElementById('f-source').value   = job.source || '';
  document.getElementById('f-status').value   = job.status || 'Applied';
  document.getElementById('f-salary').value   = job.salary || '';
  document.getElementById('f-location').value = job.location || '';
  document.getElementById('f-commute').value  = job.commute || '';
  document.getElementById('f-date').value     = job.applied_date ? job.applied_date.split('T')[0] : '';
  document.getElementById('f-notes').value    = job.notes || '';
  document.getElementById('job-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('job-modal').classList.add('hidden');
  editingId = null;
  clearForm();
}

function clearForm() {
  ['f-company','f-position','f-url','f-salary','f-location','f-commute','f-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-source').value = '';
  document.getElementById('f-status').value = 'Applied';
  document.getElementById('f-date').value = '';
}

/* ===================== CONFIG ===================== */
function openConfig() {
  document.getElementById('cfg-url').value = SUPABASE_URL;
  document.getElementById('cfg-key').value = SUPABASE_KEY;
  document.getElementById('config-modal').classList.remove('hidden');
}

function saveConfig() {
  const url = document.getElementById('cfg-url').value.trim().replace(/\/$/, '');
  const key = document.getElementById('cfg-key').value.trim();
  if (!url || !key) { showToast('⚠️ กรุณากรอกข้อมูลให้ครบ', 'warn'); return; }
  SUPABASE_URL = url;
  SUPABASE_KEY = key;
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
  document.getElementById('config-modal').classList.add('hidden');
  showToast('✅ บันทึกการตั้งค่าเรียบร้อย');
  loadJobs();
}

/* ── LOGOUT ── */
async function doLogout() {
  try {
    const token = window.__sbToken || localStorage.getItem('sb_access_token');
    if (token && SUPABASE_URL && SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
    }
  } catch (_) {}
  localStorage.removeItem('sb_access_token');
  localStorage.removeItem('sb_refresh_token');
  window.__sbToken = null;
  window.location.replace('login.html');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) {
      el.classList.add('hidden');
    }
  });
});

/* ===================== TOAST ===================== */
let toastTimer;
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.borderLeftColor = type === 'error' ? 'var(--rejected)'
    : type === 'warn' ? 'var(--offered)' : 'var(--interviewing)';
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3000);
}
