// Oddiy, lekin xavfsiz autentifikatsiya: scrypt parol-hash + HMAC imzolangan token.
// Tashqi kutubxonalarsiz (faqat Node 'crypto').
import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from 'crypto';

const SECRET = process.env.JWT_SECRET || 'onomastika-dev-secret-change-me';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 soat

// ── Parol hash ──
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const hashBuf = Buffer.from(hash, 'hex');
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

// ── Token (base64url(payload).hmac) ──
function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(data) {
  return b64url(createHmac('sha256', SECRET).update(data).digest());
}

export function createToken(payload = {}) {
  const body = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const data = b64url(JSON.stringify(body));
  return `${data}.${sign(data)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = sign(data);
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Express middleware ──
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
  }
  req.admin = payload;
  next();
}
