# Daddy Leads Scraper Backend

Minimal Express + Playwright backend that powers the Daddy Leads Sales Navigator scraper. Everything uses plain JavaScript with CommonJS modules so it is beginner friendly yet production minded.

## Features
- `/v1/scraper/salesnav/start` route guarded by JWT middleware.
- `playwright-extra` with the stealth plugin and optional proxy / fingerprint config.
- Mongo-powered proxy assignments so each user gets a stable proxy + fingerprint.
- Clean structure: config, middleware, services, routes, and a single server entry.

## Getting Started
```bash
npm install
npm start
```

The server listens on `PORT` (defaults to `4000`). Visit `GET /health` to confirm it is up.

### Environment Variables
Copy `.env` (already checked in with placeholder values) or create your own and set:
```
PORT=4000
JWT_SECRET=super-secure-secret
DADDY_LEADS_API_BASE=https://api.daddy-leads.com
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_KEEP_BROWSER_OPEN=false
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster-url/?retryWrites=true&w=majority
PROXY_DB_NAME=proxydb
PROXIES_COLLECTION=proxies
```

`config/config.js` loads these via `dotenv`, so restarting the server is enough to pick up changes. Set `PLAYWRIGHT_HEADLESS=false` whenever you want to run the scraper with a visible Chromium window for debugging, and set `PLAYWRIGHT_KEEP_BROWSER_OPEN=true` to skip auto-closing the browser after the route responds. Configure `MONGODB_URI` with your Mongo Atlas connection string so the proxy assignment service can read/write `proxydb.proxies`. In production, do **not** copy `.env`; instead inject the same variables via your process manager (PM2 `--env`, Docker `ENV`, GitHub Actions `secrets`, etc.) so the warning about `JWT_SECRET` never appears and secrets stay out of git.

### Project Layout
```
server.js
config/config.js
middleware/auth.js
routes/scraper.js
services/browser.js
services/db.js
services/proxyAssigner.js
```

`services/browser.js` centralizes Playwright setup so future scrapers can reuse the same stealth browser bootstrapper. `services/proxyAssigner.js` talks to MongoDB (`services/db.js`) to pin each user to the same proxy + fingerprint combo across runs while marking a proxy as assigned in the `proxies` collection.
