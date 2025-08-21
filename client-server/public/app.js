const AUTH_URL = 'http://localhost:3001';
const RESOURCE_URL = 'http://localhost:3002';

const state = { access_token: null, access_exp: 0, refresh_token: null, refresh_exp: 0 };
const now = () => Math.floor(Date.now()/1000);

function save() { localStorage.setItem('demoTokens', JSON.stringify(state)); }
function load() {
  try { Object.assign(state, JSON.parse(localStorage.getItem('demoTokens') || '{}')); } catch {}
}
load();

function showTokens() {
  const el = document.getElementById('authOut');
  if (!state.access_token) { el.textContent = 'Tokens: (none)'; return; }
  el.textContent = JSON.stringify({
    access_token: state.access_token.slice(0,12)+'...',
    access_expires_in_s: state.access_exp - now(),
    refresh_token: state.refresh_token.slice(0,12)+'...',
    refresh_expires_in_s: state.refresh_exp - now()
  }, null, 2);
}

async function authenticate() {
  const resp = await fetch(AUTH_URL + '/token', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: 'demo_code',
      client_id: 'demo-app',
      client_secret: 'demo-secret'
    })
  });
  const data = await resp.json();
  if (data.access_token) {
    state.access_token = data.access_token;
    state.access_exp = now() + data.expires_in;
    state.refresh_token = data.refresh_token;
    state.refresh_exp = now() + data.refresh_expires_in;
    save();
  }
  showTokens();
}

async function refreshIfNeeded() {
  if (!state.access_token) return { ok: false, reason: 'no tokens' };
  if (state.access_exp - now() > 10) return { ok: true }; // still valid (>10s buffer)
  if (now() >= state.refresh_exp) return { ok: false, reason: 'refresh expired' };

  const r = await fetch(AUTH_URL + '/token', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: state.refresh_token,
      client_id: 'demo-app',
      client_secret: 'demo-secret'
    })
  });
  const data = await r.json();
  if (!data.access_token) return { ok: false, reason: data.error || 'refresh failed' };
  state.access_token = data.access_token;
  state.access_exp = now() + data.expires_in;
  save();
  return { ok: true };
}

async function checkToken() {
  const out = document.getElementById('authOut');
  if (!state.access_token) { out.textContent = 'No access token.'; return; }
  const r = await fetch(AUTH_URL + '/introspect', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ token: state.access_token })
  });
  const data = await r.json();
  out.textContent = 'Introspection: ' + JSON.stringify(data, null, 2) + '\n\n' +
    'Stored: ' + JSON.stringify({
      exp_in_s: state.access_exp - now(),
      refresh_in_s: state.refresh_exp - now()
    }, null, 2);
}

async function revoke() {
  if (!state.refresh_token) return;
  await fetch(AUTH_URL + '/revoke', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ refresh_token: state.refresh_token })
  });
  state.access_token = null;
  state.refresh_token = null;
  state.access_exp = 0;
  state.refresh_exp = 0;
  save();
  showTokens();
}

async function sendInvoice() {
  const out = document.getElementById('sendOut');
  const r = await refreshIfNeeded();
  if (!r.ok) { out.textContent = 'Cannot send: ' + r.reason + '. Please authenticate again.'; return; }

  const resp = await fetch(RESOURCE_URL + '/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.access_token
    },
    body: JSON.stringify({ invoiceId: 'INV-001', amount: 150.00, currency: 'EUR' })
  });
  const data = await resp.json();
  out.textContent = JSON.stringify(data, null, 2);
}

document.getElementById('btnAuth').addEventListener('click', authenticate);
document.getElementById('btnCheck').addEventListener('click', checkToken);
document.getElementById('btnRevoke').addEventListener('click', revoke);
document.getElementById('btnSend').addEventListener('click', sendInvoice);

showTokens();
