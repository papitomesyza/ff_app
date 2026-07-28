import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { SESSION_SECRET } from './env.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sign(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
}

export function issueToken() {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${expires}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  let decoded;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return false;
  }
  const [payload, signature] = decoded.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  return true;
}

export function checkPassphrase(passphrase) {
  const row = db.prepare('SELECT passphrase_hash FROM settings WHERE id = 1').get();
  if (!row) return false;
  return bcrypt.compareSync(String(passphrase || ''), row.passphrase_hash);
}

export function setPassphrase(newPassphrase) {
  const hash = bcrypt.hashSync(String(newPassphrase), 10);
  db.prepare('UPDATE settings SET passphrase_hash = ?, updated_at = datetime(\'now\') WHERE id = 1').run(hash);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
