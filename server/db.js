import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SESSION_SECRET, APP_PASSPHRASE, DEV_PASSPHRASE } from './env.js';

const DATA_DIR = process.env.DATA_DIR || '/app/data';
const DB_PATH = path.join(DATA_DIR, 'financial-flow.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    passphrase_hash TEXT NOT NULL,
    env_passphrase_fingerprint TEXT,
    income_target REAL NOT NULL DEFAULT 3000,
    spending_budget REAL NOT NULL DEFAULT 2000,
    savings_target REAL NOT NULL DEFAULT 500,
    currency TEXT NOT NULL DEFAULT '$',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income','expense')),
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    amount REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
`);

function fingerprintPassphrase(passphrase) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(passphrase).digest('hex');
}

// Seed on first boot, or reconcile the login hash against APP_PASSPHRASE on every boot after.
const existing = db.prepare('SELECT passphrase_hash, env_passphrase_fingerprint FROM settings WHERE id = 1').get();

if (!existing) {
  const seedPassphrase = APP_PASSPHRASE || DEV_PASSPHRASE;
  const hash = bcrypt.hashSync(seedPassphrase, 10);
  const fingerprint = APP_PASSPHRASE ? fingerprintPassphrase(APP_PASSPHRASE) : null;
  db.prepare(`
    INSERT INTO settings (id, passphrase_hash, env_passphrase_fingerprint)
    VALUES (1, ?, ?)
  `).run(hash, fingerprint);
} else if (APP_PASSPHRASE) {
  // Only touch the login hash when APP_PASSPHRASE has actually changed since we
  // last synced it — otherwise a passphrase set later via Settings would get
  // silently clobbered on every subsequent reboot.
  const currentFingerprint = fingerprintPassphrase(APP_PASSPHRASE);
  if (currentFingerprint !== existing.env_passphrase_fingerprint) {
    const hash = bcrypt.hashSync(APP_PASSPHRASE, 10);
    db.prepare(`
      UPDATE settings SET passphrase_hash = ?, env_passphrase_fingerprint = ?, updated_at = datetime('now')
      WHERE id = 1
    `).run(hash, currentFingerprint);
  }
}

export default db;
export { DB_PATH, DATA_DIR };
