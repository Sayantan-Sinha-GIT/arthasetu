// Mints a Firebase session for the admin account using the service account the
// project already uses server-side. No password involved.
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

let raw = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').trim();
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
  raw = raw.slice(1, -1);
}
const sa = JSON.parse(raw);
const pem = (sa.private_key || sa.privateKey || '').replace(/\\n/g, '\n');
const clientEmail = sa.client_email || sa.clientEmail;
const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim();
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

function b64url(x) {
  return Buffer.from(x).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function oauthToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }));
  const sig = b64url(crypto.createSign('RSA-SHA256').update(header + '.' + claim).sign(pem));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: header + '.' + claim + '.' + sig,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('oauth failed: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

(async () => {
  const token = await oauthToken();

  // Look up the admin UID by email.
  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:lookup`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: [adminEmail] }),
    }
  );
  const lj = await lookup.json();
  const user = lj.users && lj.users[0];
  if (!user) { console.log('ADMIN USER NOT FOUND for', adminEmail, JSON.stringify(lj).slice(0, 200)); return; }

  // Self-signed custom token for that UID, including the admin claim.
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: clientEmail, sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now, exp: now + 3600,
    uid: user.localId,
    claims: { admin: true },
  }));
  const sig = b64url(crypto.createSign('RSA-SHA256').update(header + '.' + claim).sign(pem));
  const customToken = header + '.' + claim + '.' + sig;

  // Exchange it for a real id/refresh token pair.
  const ex = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const ej = await ex.json();
  if (!ej.idToken) { console.log('EXCHANGE FAILED:', JSON.stringify(ej).slice(0, 300)); return; }

  const payload = {
    uid: user.localId,
    email: user.email,
    emailVerified: user.emailVerified !== false,
    apiKey,
    idToken: ej.idToken,
    refreshToken: ej.refreshToken,
    expiresIn: ej.expiresIn,
  };
  require('fs').writeFileSync('scripts/output/admin-session.json', JSON.stringify(payload));
  console.log('SESSION READY for', user.email, '| uid', user.localId);
})();
