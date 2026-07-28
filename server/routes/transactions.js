import { Router } from 'express';
import db from '../db.js';

const router = Router();

const TYPES = new Set(['income', 'expense']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

router.get('/', (req, res) => {
  const { date, from, to } = req.query;
  let rows;
  if (date) {
    rows = db.prepare('SELECT * FROM transactions WHERE date = ? ORDER BY created_at ASC').all(date);
  } else if (from && to) {
    rows = db.prepare('SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date ASC, created_at ASC').all(from, to);
  } else {
    rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT 200').all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const body = req.body || {};
  if (!body.date || !DATE_RE.test(String(body.date)) || !TYPES.has(body.type) || !body.category || !(num(body.amount) > 0)) {
    return res.status(400).json({ error: 'date (YYYY-MM-DD), type (income|expense), category, and a positive amount are required' });
  }
  const values = {
    date: String(body.date),
    type: String(body.type),
    category: String(body.category).slice(0, 40),
    description: String(body.description || '').slice(0, 200),
    amount: num(body.amount),
  };

  const info = db.prepare(`
    INSERT INTO transactions (date, type, category, description, amount)
    VALUES (@date, @type, @category, @description, @amount)
  `).run(values);

  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'transaction not found' });

  const body = req.body || {};
  const amount = body.amount !== undefined ? num(body.amount) : existing.amount;
  const values = {
    id: existing.id,
    date: body.date !== undefined && DATE_RE.test(String(body.date)) ? String(body.date) : existing.date,
    type: body.type !== undefined && TYPES.has(body.type) ? String(body.type) : existing.type,
    category: body.category !== undefined && body.category ? String(body.category).slice(0, 40) : existing.category,
    description: body.description !== undefined ? String(body.description).slice(0, 200) : existing.description,
    amount: amount > 0 ? amount : existing.amount,
  };

  db.prepare(`
    UPDATE transactions SET date=@date, type=@type, category=@category, description=@description, amount=@amount
    WHERE id=@id
  `).run(values);

  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'transaction not found' });
  res.status(204).end();
});

export default router;
