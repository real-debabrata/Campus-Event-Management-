/**
 * Campus Events: sign-up OTP service (v3.2.0)
 *
 * Runs free on Cloudflare Workers. One file, no dependencies.
 *
 *   POST /send    { email, name, cf }                    -> emails a 6-digit code
 *   POST /verify  { email, name, password, code }        -> checks the code, creates the Firebase account
 *
 * Why the account is created HERE and not in the browser:
 * Firebase's public sign-up API can be called by any bot that has your (public) API key. Once you switch off
 * "Enable create (sign-up)" in Firebase console > Authentication > Settings > User actions, the ONLY way to make
 * an account is through this Worker, and this Worker only does it after the emailed code is proven.
 * Sign-in is untouched: it still talks to Firebase directly and needs no code.
 *
 * Secrets / settings (Cloudflare dashboard > your Worker > Settings > Variables and Secrets):
 *   FIREBASE_SA        secret   the whole service-account JSON (Firebase console > Project settings > Service accounts)
 *   BREVO_API_KEY      secret   Brevo API key (free plan: 300 emails/day)
 *   OTP_PEPPER         secret   any long random string; codes are stored only as salted hashes
 *   TURNSTILE_SECRET   secret   OPTIONAL. Cloudflare Turnstile secret key (free captcha). Leave unset to skip.
 *   FROM_EMAIL         text     sender address you verified in Brevo
 *   FROM_NAME          text     OPTIONAL, default "Campus Events"
 *   ALLOWED_ORIGINS    text     comma list of sites allowed to call this Worker (see SETUP.md)
 *   ALLOWED_EMAIL_DOMAINS text  OPTIONAL, e.g. "college.edu.in" to accept only college addresses
 *   BLOCKED_EMAIL_DOMAINS text  OPTIONAL, extra throwaway domains to refuse
 * KV namespace binding: OTP_KV
 */

const OTP_TTL_MS = 10 * 60 * 1000;   // a code works for 10 minutes
const MAX_TRIES = 5;                  // wrong guesses allowed per code
const RESEND_GAP_MS = 60 * 1000;      // minimum gap between codes for one email
const MAX_SENDS_PER_EMAIL = 5;        // codes per email per hour
const MAX_SENDS_PER_IP = 10;          // codes per network (IP) per hour
const HOUR = 60 * 60 * 1000;

// Common throwaway-mail domains. Add more with BLOCKED_EMAIL_DOMAINS.
const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'guerrillamail.de', 'sharklasers.com', 'grr.la', '10minutemail.com', '10minutemail.net', 'tempmail.com',
  'temp-mail.org', 'tempmailo.com', 'tempail.com', 'yopmail.com', 'yopmail.net', 'trashmail.com',
  'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com', 'fakeinbox.com', 'mintemail.com',
  'mohmal.com', 'emailondeck.com', 'burnermail.io', 'moakt.com', 'spamgourmet.com', 'mailnesia.com',
  'mytemp.email', 'inboxkitten.com', 'discard.email', 'getairmail.com', 'mail.tm', 'tmpmail.org',
  'tmpmail.net', 'fakemail.net', 'emailfake.com', 'crazymailing.com', 'mailcatch.com', 'trash-mail.com'
]);

class HttpError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}

const enc = new TextEncoder();

/* ---------- small helpers ---------- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const pemToDer = pem => {
  const bin = atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
const safeEq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = v => String(v || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

// Uniformly random 6-digit code (rejection sampling, no modulo bias).
function makeOtp() {
  const a = new Uint32Array(1), lim = Math.floor(0x100000000 / 1000000) * 1000000;
  do { crypto.getRandomValues(a); } while (a[0] >= lim);
  return String(a[0] % 1000000).padStart(6, '0');
}

const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const h = { 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
  const ok = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origin && ok.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

async function readJson(req) {
  const t = await req.text();
  if (t.length > 2048) throw new HttpError(413, 'Request too large.');
  let b; try { b = JSON.parse(t); } catch (e) { throw new HttpError(400, 'Bad request.'); }
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Bad request.');
  return b;
}

/* ---------- input checks ---------- */
function cleanEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new HttpError(400, 'Enter a valid email address.');
  return e;
}
function cleanName(v) {
  const n = String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!n) throw new HttpError(400, 'Enter your name.');
  return n;
}
function cleanPw(v) {
  const p = typeof v === 'string' ? v : '';
  if (p.length < 6) throw new HttpError(400, 'Use a password with at least 6 characters.');
  if (p.length > 128) throw new HttpError(400, 'That password is too long (128 characters max).');
  return p;
}
function checkDomain(email, env) {
  const d = email.split('@')[1];
  const allow = list(env.ALLOWED_EMAIL_DOMAINS);
  if (allow.length && !allow.some(a => d === a || d.endsWith('.' + a))) throw new HttpError(400, 'Please use your ' + allow.join(' or ') + ' email address.');
  if (DISPOSABLE.has(d) || list(env.BLOCKED_EMAIL_DOMAINS).includes(d)) throw new HttpError(400, 'Temporary email addresses are not accepted. Use your real email.');
}
function needConfig(env) {
  const miss = ['OTP_KV', 'OTP_PEPPER', 'FIREBASE_SA', 'BREVO_API_KEY', 'FROM_EMAIL'].filter(k => !env[k]);
  if (miss.length) { console.error('Missing settings: ' + miss.join(', ')); throw new HttpError(500, 'Sign-up is not set up yet. Please tell the admin.'); }
}

/* ---------- Cloudflare Turnstile (optional free captcha) ---------- */
async function checkTurnstile(env, token, ip) {
  if (!token || typeof token !== 'string') throw new HttpError(400, 'Security check missing. Wait for it to finish and try again.');
  const f = new FormData();
  f.append('secret', env.TURNSTILE_SECRET); f.append('response', token); if (ip !== 'unknown') f.append('remoteip', ip);
  let j = {};
  try { j = await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: f })).json(); } catch (e) { /* treated as failure */ }
  if (!j.success) throw new HttpError(400, 'Security check failed. Please try again.');
}

/* ---------- Firebase Auth admin (REST, no SDK needed) ---------- */
let SA = null, gTok = null, gExp = 0;
function serviceAccount(env) {
  if (!SA) {
    try { SA = JSON.parse(env.FIREBASE_SA); } catch (e) { console.error('FIREBASE_SA is not valid JSON'); throw new HttpError(500, 'Sign-up is not set up yet. Please tell the admin.'); }
    if (!SA.client_email || !SA.private_key || !SA.project_id) { SA = null; console.error('FIREBASE_SA is missing client_email, private_key or project_id'); throw new HttpError(500, 'Sign-up is not set up yet. Please tell the admin.'); }
  }
  return SA;
}
async function googleToken(env) {
  if (gTok && Date.now() < gExp - 60000) return gTok;
  const sa = serviceAccount(env), now = Math.floor(Date.now() / 1000);
  const part = o => b64u(enc.encode(JSON.stringify(o)));
  const unsigned = part({ alg: 'RS256', typ: 'JWT' }) + '.' + part({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  });
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + unsigned + '.' + b64u(sig)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) { console.error('Google token error', r.status, JSON.stringify(j)); throw new HttpError(502, 'Could not reach the account service. Try again.'); }
  gTok = j.access_token; gExp = Date.now() + (j.expires_in || 3600) * 1000;
  return gTok;
}
async function firebase(env, path, body) {
  const sa = serviceAccount(env), tok = await googleToken(env);
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + sa.project_id + path, {
    method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}
async function userExists(env, email) {
  const r = await firebase(env, '/accounts:lookup', { email: [email] });
  if (!r.ok) { console.error('lookup failed', r.status, JSON.stringify(r.data)); throw new HttpError(502, 'Could not reach the account service. Try again.'); }
  return Array.isArray(r.data.users) && r.data.users.length > 0;
}

/* ---------- email (Brevo) ---------- */
async function sendMail(env, email, name, otp) {
  const safe = esc(name);
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:auto;color:#14213d">' +
    '<h2 style="margin:0 0 8px">Campus Events</h2><p>Hi ' + safe + ',</p>' +
    '<p>Use this code to finish creating your account:</p>' +
    '<p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:16px 0">' + otp + '</p>' +
    '<p style="color:#5b6678;font-size:13px">It expires in 10 minutes. If you did not try to sign up, ignore this email. Nobody can use the code without your inbox.</p></div>';
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: env.FROM_NAME || 'Campus Events', email: env.FROM_EMAIL }, to: [{ email, name }],
      subject: otp + ' is your Campus Events code', htmlContent: html,
      textContent: 'Your Campus Events code is ' + otp + '. It expires in 10 minutes. If you did not try to sign up, ignore this email.'
    })
  });
  if (!r.ok) { console.error('Brevo error', r.status, await r.text().catch(() => '')); throw new HttpError(502, 'Could not send the email. Please try again in a minute.'); }
}

/* ---------- routes ---------- */
const ttlFor = (w, now) => Math.max(60, Math.ceil((w + HOUR - now) / 1000)); // KV needs at least 60 s

async function handleSend(b, req, env, cors) {
  needConfig(env);
  const email = cleanEmail(b.email), name = cleanName(b.name);
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';

  // Cheap checks first, so bots never reach the (limited) KV writes or the email quota.
  if (env.TURNSTILE_SECRET) await checkTurnstile(env, b.cf, ip);
  checkDomain(email, env);
  if (await userExists(env, email)) throw new HttpError(409, 'An account with this email already exists. Try signing in.');

  const now = Date.now();
  const ipKey = 'ip:' + ip + ':' + Math.floor(now / HOUR);
  const ipN = parseInt(await env.OTP_KV.get(ipKey) || '0', 10);
  if (ipN >= MAX_SENDS_PER_IP) throw new HttpError(429, 'Too many requests from this network. Try again in an hour.');

  const key = 'otp:' + email;
  const old = await env.OTP_KV.get(key, 'json');
  let w = now, sends = 0;
  if (old && now - old.w < HOUR) {
    w = old.w; sends = old.sends;
    const wait = RESEND_GAP_MS - (now - old.last);
    if (wait > 0) throw new HttpError(429, 'Please wait ' + Math.ceil(wait / 1000) + ' seconds before asking for another code.', Math.ceil(wait / 1000));
    if (sends >= MAX_SENDS_PER_EMAIL) throw new HttpError(429, 'Too many codes requested for this email. Try again in an hour.');
  }

  const otp = makeOtp();
  const rec = { h: await sha(env.OTP_PEPPER + ':' + email + ':' + otp), exp: now + OTP_TTL_MS, tries: 0, sends: sends + 1, last: now, w };
  await env.OTP_KV.put(key, JSON.stringify(rec), { expirationTtl: ttlFor(w, now) });
  await env.OTP_KV.put(ipKey, String(ipN + 1), { expirationTtl: 3700 });
  await sendMail(env, email, name, otp);
  return json({ ok: true, expiresIn: OTP_TTL_MS / 1000, retryAfter: RESEND_GAP_MS / 1000 }, 200, cors);
}

async function handleVerify(b, req, env, cors) {
  needConfig(env);
  const email = cleanEmail(b.email), name = cleanName(b.name), password = cleanPw(b.password);
  const code = String(b.code || '').replace(/\D/g, '');
  if (code.length !== 6) throw new HttpError(400, 'Enter the 6-digit code.');

  const key = 'otp:' + email, now = Date.now();
  const rec = await env.OTP_KV.get(key, 'json');
  if (!rec || now > rec.exp) throw new HttpError(400, 'This code has expired. Request a new one.');
  if (rec.tries >= MAX_TRIES) throw new HttpError(429, 'Too many wrong attempts. Request a new code.');

  const h = await sha(env.OTP_PEPPER + ':' + email + ':' + code);
  if (!safeEq(h, rec.h)) {
    rec.tries += 1;
    await env.OTP_KV.put(key, JSON.stringify(rec), { expirationTtl: ttlFor(rec.w, now) });
    const left = MAX_TRIES - rec.tries;
    throw new HttpError(400, left > 0 ? 'Wrong code. ' + left + (left === 1 ? ' try' : ' tries') + ' left.' : 'Too many wrong attempts. Request a new code.');
  }

  const r = await firebase(env, '/accounts', { email, password, displayName: name, emailVerified: true });
  if (!r.ok) {
    const m = (r.data && r.data.error && r.data.error.message) || '';
    if (/EMAIL_EXISTS/.test(m)) throw new HttpError(409, 'An account with this email already exists. Try signing in.');
    if (/WEAK_PASSWORD/.test(m)) throw new HttpError(400, 'Use a password with at least 6 characters.');
    if (/INVALID_EMAIL/.test(m)) throw new HttpError(400, 'Enter a valid email address.');
    console.error('createUser failed', r.status, JSON.stringify(r.data));
    throw new HttpError(502, 'Could not create the account. Please try again.');
  }
  await env.OTP_KV.delete(key); // a code works once
  return json({ ok: true }, 200, cors);
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env), path = new URL(req.url).pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method === 'GET' && path === '/') return json({ ok: true, service: 'campus-events-otp' }, 200, cors);
    try {
      if (req.method !== 'POST' || (path !== '/send' && path !== '/verify')) throw new HttpError(404, 'Not found.');
      if (!cors['Access-Control-Allow-Origin']) throw new HttpError(403, 'This site is not allowed to use the sign-up service.');
      const body = await readJson(req);
      return path === '/send' ? await handleSend(body, req, env, cors) : await handleVerify(body, req, env, cors);
    } catch (e) {
      if (e instanceof HttpError) return json({ ok: false, message: e.message, retryAfter: e.retryAfter }, e.status, cors);
      console.error('Unhandled', e && e.stack || e);
      return json({ ok: false, message: 'Server error. Please try again.' }, 500, cors);
    }
  }
};
