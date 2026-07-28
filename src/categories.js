import { useEffect, useState } from 'react';
import { api } from './api.js';

// Categories are needed by nearly every screen (add sheet, transaction rows,
// the spending breakdown, settings) but change rarely, so they live in one
// module-level cache with subscribers instead of being re-fetched per page or
// threaded through props.
let cache = null;
let inflight = null;
const listeners = new Set();

function publish(next) {
  cache = next;
  for (const listener of listeners) listener(next);
}

export function loadCategories({ force = false } = {}) {
  if (cache && !force) return Promise.resolve(cache);
  if (inflight && !force) return inflight;
  inflight = api.getCategories()
    .then((rows) => {
      publish(rows);
      return rows;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Call after any create/update/delete so every mounted screen re-renders.
export function refreshCategories() {
  return loadCategories({ force: true });
}

// Returns null until the first load lands — callers fall back to a prettified
// id in the meantime, so nothing renders blank.
export function useCategories() {
  const [categories, setCategories] = useState(cache);

  useEffect(() => {
    listeners.add(setCategories);
    loadCategories();
    return () => {
      listeners.delete(setCategories);
    };
  }, []);

  return categories;
}

export function categoriesOfType(categories, type) {
  return (categories || []).filter((c) => c.type === type);
}

export function findCategory(categories, id) {
  return (categories || []).find((c) => c.id === id) || null;
}

// A transaction can outlive the category it was filed under (the category was
// deleted, or the row arrived from an integration). Fall back to a readable
// version of the stored id rather than showing nothing.
function prettifyId(id) {
  return String(id || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Uncategorized';
}

export function categoryLabel(categories, id) {
  return findCategory(categories, id)?.label ?? prettifyId(id);
}

export function categoryColor(categories, id, fallback = 'var(--text-dim)') {
  return findCategory(categories, id)?.color ?? fallback;
}

// Palette offered when creating or recoloring a category — Apple's dark-mode
// system colors, the same family the rest of the app is built from.
export const CATEGORY_PALETTE = [
  '#00d341', '#30d158', '#66d4cf', '#64d2ff', '#0a84ff', '#5e5ce6',
  '#bf5af2', '#ff375f', '#ff453a', '#ff9f0a', '#ffd60a', '#98989d',
];
