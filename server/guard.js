// Refuses to boot in production with insecure default configuration.
// Must be imported before db.js (or anything that imports it) so a bad
// deploy never gets far enough to seed or touch the database.

import { DEV_SESSION_SECRET, PASSPHRASE_PLACEHOLDERS } from './env.js';

if (process.env.NODE_ENV === 'production') {
  const problems = [];

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret === DEV_SESSION_SECRET) {
    problems.push('SESSION_SECRET is unset or still the insecure development default');
  }

  const passphrase = process.env.APP_PASSPHRASE;
  if (!passphrase || PASSPHRASE_PLACEHOLDERS.has(passphrase)) {
    problems.push('APP_PASSPHRASE is unset or still a placeholder value ("change-me" / "change-me-flow")');
  }

  if (problems.length > 0) {
    console.error('Refusing to start: insecure configuration detected in production.');
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('Set these environment variables to real, unique values before deploying.');
    process.exit(1);
  }
}
