import { Router } from 'express';
import db from '../db.js';

const router = Router();

const NUMERIC_FIELDS = ['income_target', 'spending_budget', 'savings_target'];
const FIELDS = [...NUMERIC_FIELDS, 'currency'];

router.get('/', (req, res) => {
  const row = db.prepare(`SELECT ${FIELDS.join(', ')} FROM settings WHERE id = 1`).get();
  res.json(row);
});

router.put('/', (req, res) => {
  const body = req.body || {};
  const existing = db.prepare(`SELECT ${FIELDS.join(', ')} FROM settings WHERE id = 1`).get();
  const values = { id: 1 };
  for (const f of NUMERIC_FIELDS) {
    const n = Number(body[f]);
    values[f] = Number.isFinite(n) && n >= 0 ? n : existing[f];
  }
  values.currency = body.currency ? String(body.currency).slice(0, 4) : existing.currency;
  db.prepare(`
    UPDATE settings SET
      income_target=@income_target, spending_budget=@spending_budget,
      savings_target=@savings_target, currency=@currency, updated_at=datetime('now')
    WHERE id=@id
  `).run(values);
  const row = db.prepare(`SELECT ${FIELDS.join(', ')} FROM settings WHERE id = 1`).get();
  res.json(row);
});

export default router;
