import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Demo client credentials
const CLIENT_ID = 'demo-app';
const CLIENT_SECRET = 'demo-secret';

// In-memory token store (for demo)
const tokenStore = {
  accessTokens: new Map(),   // accessToken -> { expiresAt, refreshToken }
  refreshTokens: new Map()   // refreshToken -> { expiresAt, accessToken }
};

const AUTH_CODE = 'demo_code';
const ACCESS_TTL = 15 * 60;       // 15 minutes
const REFRESH_TTL = 11 * 60 * 60; // 11 hours

const now = () => Math.floor(Date.now() / 1000);
const randomToken = (p) => p + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);



// Token endpoint: authorization_code + refresh_token
app.post('/token', (req, res) => {
  const { grant_type, code, client_id, client_secret, refresh_token } = req.body;

  if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  if (grant_type === 'authorization_code') {
    if (code !== AUTH_CODE) return res.status(400).json({ error: 'invalid_grant' });

    const accessToken = randomToken('at_');
    const refreshToken = randomToken('rt_');
    const accessExp = now() + ACCESS_TTL;
    const refreshExp = now() + REFRESH_TTL;

    tokenStore.accessTokens.set(accessToken, { expiresAt: accessExp, refreshToken });
    tokenStore.refreshTokens.set(refreshToken, { expiresAt: refreshExp, accessToken });

    return res.json({
      token_type: 'Bearer',
      access_token: accessToken,
      expires_in: ACCESS_TTL,
      refresh_token: refreshToken,
      refresh_expires_in: REFRESH_TTL,
      scope: 'accounting:documents clients'
    });
  }

  if (grant_type === 'refresh_token') {  // check
    const rec = tokenStore.refreshTokens.get(refresh_token);
    if (!rec) return res.status(400).json({ error: 'invalid_refresh_token' });
    if (rec.expiresAt <= now()) return res.status(401).json({ error: 'refresh_expired' });

    const newAccess = randomToken('at_');
    const accessExp = now() + ACCESS_TTL;
    tokenStore.accessTokens.set(newAccess, { expiresAt: accessExp, refreshToken: refresh_token });

    // Invalidate old access (if any)
    if (rec.accessToken) tokenStore.accessTokens.delete(rec.accessToken);
    rec.accessToken = newAccess;

    return res.json({
      token_type: 'Bearer',
      access_token: newAccess,
      expires_in: ACCESS_TTL,
      refresh_token,
      refresh_expires_in: rec.expiresAt - now(),
      scope: 'accounting:documents clients'
    });
  }

  return res.status(400).json({ error: 'unsupported_grant_type' });
});

// Revoke refresh + its access
app.post('/revoke', (req, res) => {
  const { refresh_token } = req.body;
  const rec = tokenStore.refreshTokens.get(refresh_token);
  if (rec) {
    tokenStore.refreshTokens.delete(refresh_token);
    if (rec.accessToken) tokenStore.accessTokens.delete(rec.accessToken);
  }
  return res.json({ revoked: true });
});

// Introspect access token (used by resource server)
app.post('/introspect', (req, res) => {
  const { token } = req.body;
  const rec = tokenStore.accessTokens.get(token);
  if (!rec) return res.json({ active: false });
  const remaining = rec.expiresAt - now();
  return res.json({ active: remaining > 0, exp: rec.expiresAt, remaining_seconds: Math.max(0, remaining) });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[auth-server] http://localhost:${PORT}`));
