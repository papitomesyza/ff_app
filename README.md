# Financial Flow

A focused personal finances tracker. Single user, installable to your phone's home screen. Log income and spending, see your monthly cash flow at a glance, and browse your history by week, month, or year — the same logic as the year28 Macros tracker, applied to money.

## Stack

- **Backend:** Node.js + Express, [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for storage
- **Frontend:** React + Vite, [recharts](https://recharts.org/) for charts, [lucide-react](https://lucide.dev/) for icons
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — installable, offline app shell
- In production, one Express process serves the built frontend and the `/api` routes on port 3000.

## Features

- **Overview** — this month's income vs target and spending vs budget as progress rings, net balance, savings-goal progress, spending broken down by category, and the month's transactions.
- **Add** — log income or an expense in a few taps: type, category chip, amount, optional description, date (defaults to today).
- **History** — week / month / year browsing with income and spending charts, a calendar with activity dots, per-day drill-down (tap any day to view/edit/delete its transactions), and copy-to-clipboard summaries.
- **Settings** — monthly income target, spending budget, savings goal, currency symbol, custom income/expense categories, passphrase change.

### Categories

Income and expense categories are fully editable from Settings — add your own, rename them, and pick a color from the app's palette. A default set is seeded on first boot; after that the list is yours, and deletions or renames are never undone by a reboot.

Two rules keep your history intact. Renaming a category never detaches its transactions, because transactions store a stable id assigned at creation rather than the display name. And deleting a category never deletes money: if any transactions still use it, the app tells you how many and asks you to confirm — those transactions keep their amounts and stay in your totals, simply displaying the old category name.

The `Massiv` category is marked as a system category: it can be renamed and recolored, but not deleted, because the Massiv Control Panel sync files its income under that id.

## Local development

```bash
npm install
cp .env.example .env
# edit .env — set APP_PASSPHRASE and SESSION_SECRET
```

For local dev, point the SQLite file somewhere writable outside the container path by adding to `.env`:

```
DATA_DIR=./data
```

Then run the dev server (Vite frontend on :5173, Express API on :3000, proxied):

```bash
npm run dev
```

Open http://localhost:5173 and log in with your `APP_PASSPHRASE`.

## Production build

```bash
npm run build   # builds the frontend into dist/
npm start       # runs Express, serving dist/ + /api on port 3000
```

## Environment variables

| Variable | Purpose |
|---|---|
| `APP_PASSPHRASE` | The single-user login passphrase. **Authoritative on every boot**: if it differs from the value last synced (tracked via an HMAC fingerprint, keyed with `SESSION_SECRET`, in the settings table), the login hash is updated to match. If you later change the passphrase from Settings, rebooting with the *same* `APP_PASSPHRASE` will not overwrite it — only an actual change to the env var does. Must not be unset or a placeholder (`change-me` / `change-me-flow`) when `NODE_ENV=production`. |
| `SESSION_SECRET` | Secret used to sign session tokens and to fingerprint `APP_PASSPHRASE`. Set this to a long random string. Must not be unset or the dev default when `NODE_ENV=production`. |
| `FLOW_SYNC_KEY` | Optional. Shared secret for the machine-to-machine sync API (`/api/sync`), used by Massiv Control Panel to mirror received client payments into Financial Flow as `Massiv` income. Unset = sync endpoints disabled (they return 503); everything else works. Must match `FLOW_SYNC_KEY` on the Massiv service. |
| `PORT` | Defaults to `3000`. |
| `DATA_DIR` | Where the SQLite file lives. Defaults to `/app/data` (matches the Zeabur volume mount). |
| `NODE_ENV` | Set to `production` by the Dockerfile. When set, the server refuses to start if `SESSION_SECRET` or `APP_PASSPHRASE` are still unset or placeholder values — it exits with an error naming the offending variable instead of booting insecurely. |

Login attempts are rate-limited to 10 per 15 minutes per IP; other `/api` routes are unaffected.

## Deploying to Zeabur

1. Push this repo to GitHub.
2. In Zeabur, create a new service from the repo using the **Docker** provider — it will build from the included `Dockerfile`.
3. Attach a persistent volume mounted at `/app/data`.
4. Set the environment variables above (`APP_PASSPHRASE`, `SESSION_SECRET`) to real values — the container will exit on boot with a clear error if either is missing or still a placeholder, since the image sets `NODE_ENV=production`.
5. Deploy. The app boots fine against an empty volume — it creates the SQLite file and seeds default targets on first run.

## Data model notes

- **Transactions** store a frozen snapshot: `date`, `type` (`income` | `expense`), `category`, optional `description`, and `amount`. The `category` is a stable id, so renaming a category leaves past transactions attached to it.
- **Categories** are rows in their own table (`id`, `type`, `label`, `color`, `sort_order`, `is_system`), seeded once on first boot. The transactions table holds the id as a plain string rather than a foreign key, so a deleted category can never cascade into deleted money.
- **Settings** hold the monthly targets (income target, spending budget, savings goal), the currency symbol, and the passphrase hash — a single-row table, seeded on first boot.
- All aggregation (week/month/year history, daily series) is computed read-only from the transactions table at request time; nothing is denormalized.

---

a year28 development
