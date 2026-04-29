# Progress Portal Backend

Express + TypeScript backend for the `progress-portal` frontend.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
copy .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

Server runs on `http://localhost:4000`.

## Data storage

This backend now uses a real SQLite database file:

- `backend/data/app.db`

On first run, if `backend/data/db.json` exists, data is auto-imported into SQLite.
After that, all signup/login/mutations are persisted in SQLite.

## Frontend setup

In `progress-portal/.env`, set:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_USE_MOCK=false
```
