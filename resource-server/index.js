import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const AUTH_INTROSPECT_URL = 'http://localhost:3001/introspect'; // check

async function validateAccessToken(bearer) {
  if (!bearer) return { ok: false, reason: 'missing Authorization header' };
  const parts = bearer.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return { ok: false, reason: 'invalid header format' };
  const token = parts[1];

  try {
    const r = await fetch(AUTH_INTROSPECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await r.json();
    if (data.active) return { ok: true };
    return { ok: false, reason: 'token not active/expired' };
  } catch {
    return { ok: false, reason: 'introspection error' };
  }
}

// Protected endpoint (like posting invoice to DATEV)
app.post('/invoices', async (req, res) => {
  const check = await validateAccessToken(req.headers['authorization']);
  if (!check.ok) return res.status(401).json({ error: 'unauthorized', reason: check.reason });

  const { invoiceId = 'INV-001', amount = 0, currency = 'EUR' } = req.body || {};
  return res.json({
    status: 'received',
    echo: { invoiceId, amount, currency },
    storedAt: new Date().toISOString()
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`[resource-server] http://localhost:${PORT}`));
