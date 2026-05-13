// frontend/js/api.js

const API_BASE = '/api';

// ── Token Management ──────────────────────────────────────────
const getToken   = ()      => localStorage.getItem('token');
const setToken   = (t)     => localStorage.setItem('token', t);
const setUser    = (u)     => localStorage.setItem('user', JSON.stringify(u));
const getUser    = ()      => JSON.parse(localStorage.getItem('user') || 'null');
const clearAuth  = ()      => { localStorage.removeItem('token'); localStorage.removeItem('user'); };
const isLoggedIn = ()      => !!getToken();

// ── Core Fetch Wrapper ────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token   = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Auth ──────────────────────────────────────────────────────
async function register(name, email, password) {
  const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  setToken(data.token); setUser(data.user); return data;
}

async function login(email, password) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(data.token); setUser(data.user); return data;
}

function logout() { clearAuth(); window.location.href = '/'; }

// ── Fitness ───────────────────────────────────────────────────
async function submitFitnessData(formData) {
  return apiFetch('/fitness/predict', { method: 'POST', body: JSON.stringify(formData) });
}
async function getHistory()    { return apiFetch('/fitness/history'); }
async function getLatestEntry(){ return apiFetch('/fitness/latest');  }

// ── Chat ──────────────────────────────────────────────────────
// message  — the user's text
// profile  — the _latest fitness entry object (gives Claude context)
// history  — array of { role, content } for multi-turn memory
async function sendChatMessage(message, profile, history = []) {
  return apiFetch('/chat', {
    method: 'POST',
    body:   JSON.stringify({ message, profile, history })
  });
}

// ── Guards ────────────────────────────────────────────────────
function requireAuth() {
  if (!isLoggedIn()) { window.location.href = '/?login=required'; return false; }
  return true;
}
function redirectIfLoggedIn() { if (isLoggedIn()) window.location.href = '/dashboard'; }

// ── UI Helpers ────────────────────────────────────────────────
function setNavbarUser() {
  const user = getUser();
  const el   = document.getElementById('nav-username');
  if (el && user) el.textContent = user.name;
}

function setButtonLoading(btn, loading, originalText) {
  btn.disabled  = loading;
  btn.innerHTML = loading ? `<span class="spinner"></span> Processing...` : originalText;
}

function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}