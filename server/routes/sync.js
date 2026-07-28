import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db.js';

// Machine-to-machine sync API, used by Massiv Control Panel to mirror
// received client payments into Financial Flow. Authenticated with a shared
// static key (X-Sync-Key header) instead of a login session, and keyed by
// external_id so upserts are idempotent and retractions are possible.
const router = Router();

const SYNC_KEY = process.env.FLOW_SYNC_KEY || '';
const TYPES = new Set(['income', 'expense']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function requireSyncKey(req, res, next) {
  if (!SYNC_KEY) {
    return res.status(503).json({ error: 'sync is disabled — FLOW_SYNC_KEY is not set' });
  }
  const provided = Buffer.from(String(req.headers['x-sync-key'] || ''));
  const expected = Buffer.from(SYNC_KEY);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Upsert one transaction by external_id.
router.post('/transactions', requireSyncKey, (req, res) => {
  const body = req.body || {};
  const amount = Number(body.amount);
  if (!body.external_id || !body.date || !DATE_RE.test(String(body.date)) || !TYPES.has(body.type) || !body.category || !(amount > 0)) {
    return res.status(400).json({ error: 'external_id, date (YYYY-MM-DD), type (income|expense), category, and a positive amount are required' });
  }
  const values = {
    external_id: String(body.external_id).slice(0, 100),
    date: String(body.date),
    type: String(body.type),
    category: String(body.category).slice(0, 40),
    description: String(body.description || '').slice(0, 200),
    amount,
  };

  const existing = db.prepare('SELECT id FROM transactions WHERE external_id = ?').get(values.external_id);
  if (existing) {
    db.prepare(`
      UPDATE transactions SET date=@date, type=@type, category=@category, description=@description, amount=@amount
      WHERE external_id=@external_id
    `).run(values);
    const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(existing.id);
    return res.json(row);
  }

  const info = db.prepare(`
    INSERT INTO transactions (date, type, category, description, amount, external_id)
    VALUES (@date, @type, @category, @description, @amount, @external_id)
  `).run(values);
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// Retract a previously synced transaction. Removing something that was never
// synced (or already removed) is fine — the end state is the same.
router.delete('/transactions/:externalId', requireSyncKey, (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE external_id = ?').run(req.params.externalId);
  res.json({ ok: true, removed: info.changes > 0 });
});

export default router;
