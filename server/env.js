// Central place for reading security-sensitive env vars and their insecure
// dev-only fallbacks, so db.js / auth.js / guard.js agree on the same values.

export const DEV_SESSION_SECRET = 'dev-only-insecure-secret';
export const DEV_PASSPHRASE = 'change-me-flow';
export const PASSPHRASE_PLACEHOLDERS = new Set(['change-me', 'change-me-flow']);

export const SESSION_SECRET = process.env.SESSION_SECRET || DEV_SESSION_SECRET;

// Undefined when the operator hasn't set it — callers must handle that case
// explicitly rather than silently falling back.
export const APP_PASSPHRASE = process.env.APP_PASSPHRASE;
