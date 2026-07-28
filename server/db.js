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
    external_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income','expense')),
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#98989d',
    sort_order INTEGER NOT NULL DEFAULT 0,
    -- System categories can be renamed and recolored but never deleted:
    -- something outside the UI depends on the id existing (e.g. the Massiv
    -- sync always files its income under 'massiv').
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Idempotent migration: add external_id (sync key for rows pushed from other
// systems, e.g. Massiv Control Panel) if an older DB doesn't have it yet.
const txColumns = db.prepare('PRAGMA table_info(transactions)').all();
if (!txColumns.some((c) => c.name === 'external_id')) {
  db.exec('ALTER TABLE transactions ADD COLUMN external_id TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id) WHERE external_id IS NOT NULL');

// Seed the default category set once, on first boot only. After that the list
// is entirely the user's — deletions and renames are never undone by a reboot.
const DEFAULT_CATEGORIES = [
  ['massiv', 'income', 'Massiv', '#00d341', 1],
  ['salary', 'income', 'Salary', '#00d341', 0],
  ['freelance', 'income', 'Freelance', '#30d158', 0],
  ['investment', 'income', 'Investment', '#66d4cf', 0],
  ['gift', 'income', 'Gift', '#bf5af2', 0],
  ['other-income', 'income', 'Other', '#98989d', 0],
  ['housing', 'expense', 'Housing', '#0a84ff', 0],
  ['food', 'expense', 'Food', '#ff9f0a', 0],
  ['transport', 'expense', 'Transport', '#64d2ff', 0],
  ['utilities', 'expense', 'Utilities', '#ffd60a', 0],
  ['health', 'expense', 'Health', '#ff375f', 0],
  ['entertainment', 'expense', 'Entertainment', '#bf5af2', 0],
  ['shopping', 'expense', 'Shopping', '#ff9f0a', 0],
  ['subscriptions', 'expense', 'Subscriptions', '#66d4cf', 0],
  ['travel', 'expense', 'Travel', '#30d158', 0],
  ['other-expense', 'expense', 'Other', '#98989d', 0],
];

const categoryCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
if (categoryCount === 0) {
  const insert = db.prepare(
    'INSERT INTO categories (id, type, label, color, sort_order, is_system) VALUES (?, ?, ?, ?, ?, ?)'
  );
  DEFAULT_CATEGORIES.forEach(([id, type, label, color, isSystem], i) => {
    insert.run(id, type, label, color, i, isSystem);
  });
}

// The Massiv sync files income under 'massiv' unconditionally, so that row has
// to exist even on a database seeded before this table did.
const massivRow = db.prepare("SELECT id FROM categories WHERE id = 'massiv'").get();
if (!massivRow) {
  db.prepare(
    "INSERT INTO categories (id, type, label, color, sort_order, is_system) VALUES ('massiv', 'income', 'Massiv', '#00d341', -1, 1)"
  ).run();
}

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
