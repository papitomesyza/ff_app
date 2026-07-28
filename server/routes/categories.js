import { Router } from 'express';
import db from '../db.js';

const router = Router();

const TYPES = new Set(['income', 'expense']);
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Ids are derived from the label once, at creation, and then never change —
// transactions store the id, so a later rename keeps its history attached.
function slugify(label) {
  return String(label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function uniqueId(base) {
  const seed = base || 'category';
  let candidate = seed;
  let n = 2;
  while (db.prepare('SELECT id FROM categories WHERE id = ?').get(candidate)) {
    candidate = `${seed}-${n++}`;
  }
  return candidate;
}

function listCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY type ASC, sort_order ASC, label ASC').all();
}

router.get('/', (req, res) => {
  res.json(listCategories());
});

router.post('/', (req, res) => {
  const body = req.body || {};
  const label = String(body.label || '').trim().slice(0, 40);
  if (!label || !TYPES.has(body.type)) {
    return res.status(400).json({ error: 'label and type (income|expense) are required' });
  }
  const color = COLOR_RE.test(body.color || '') ? body.color : '#98989d';
  const id = uniqueId(slugify(label));
  const nextOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM categories WHERE type = ?')
    .get(body.type).n;

  db.prepare('INSERT INTO categories (id, type, label, color, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(id, String(body.type), label, color, nextOrder);

  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

// Label and color are editable for every category; type and id are fixed, so
// existing transactions can never be re-bucketed out from under the user.
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'category not found' });

  const body = req.body || {};
  const label = body.label !== undefined ? String(body.label).trim().slice(0, 40) : existing.label;
  if (!label) return res.status(400).json({ error: 'label cannot be empty' });
  const color = COLOR_RE.test(body.color || '') ? body.color : existing.color;

  db.prepare('UPDATE categories SET label = ?, color = ? WHERE id = ?').run(label, color, existing.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(existing.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'category not found' });
  if (existing.is_system) {
    return res.status(409).json({ error: `"${existing.label}" is used by an integration and cannot be deleted` });
  }

  const inUse = db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE category = ?').get(existing.id).n;
  // Deleting a category never deletes money. The transactions keep their
  // stored category id and simply render under its old name, so the caller
  // has to opt in once it knows the count.
  if (inUse > 0 && String(req.query.force || '') !== '1') {
    return res.status(409).json({
      error: `${inUse} transaction${inUse === 1 ? '' : 's'} still ${inUse === 1 ? 'uses' : 'use'} this category`,
      inUse,
    });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(existing.id);
  res.json({ ok: true, inUse });
});

export default router;
