# Daddy Leads Backend – AI Brief

## Big Picture
- Single Express app (`server.js`) that exposes `/health` plus `/v1/scraper` routes. Keep everything CommonJS + plain JS.
- Scraper routes bootstrap Playwright through `services/browser.js` and run per-request flows (JWT auth → proxy/fingerprint lookup → browser start → scraping logic).
- Persistence (sessions, users, proxy pools) is not implemented yet. Leave clear placeholders so future Mongo/Postgres calls can slide in without reshaping modules.

## Key Files
- `config/config.js`: central source for env-driven settings. Always import from here (never read `process.env` in other modules). Warns loudly when `JWT_SECRET` is missing.
- `middleware/auth.js`: minimal JWT verifier. Extend this file with session/credit checks; do not sprinkle auth logic elsewhere.
- `services/browser.js`: the only place that should touch `playwright-extra`. Handles stealth plugin registration, proxy wiring, and safe defaults for viewport, locale, timeouts.
- `routes/scraper.js`: houses `/salesnav/start`. Keep SaaS-specific orchestration (credit checks, proxy assignment, Sales Navigator actions) inside route-level helpers, not in the server entry.

## Workflow & Commands
- Install deps once: `npm install` (pulls `playwright` browsers; expect a large download).
- Local run: `npm start` (or `node server.js`). Stop with `Ctrl+C` when done.
- The stealth plugin dependency is aliased (`playwright-extra-plugin-stealth` → `puppeteer-extra-plugin-stealth@^2.11.2`). Leave the alias intact so `require('playwright-extra-plugin-stealth')` keeps working.

## Patterns & Expectations
- All modules return plain objects or functions; avoid classes unless a genuine state machine appears.
- Any new scraper route must reuse `authenticateJWT` and `initStealthBrowser` to stay consistent on auth + Playwright boot.
- Keep Playwright options simple: accept `{ proxy, fingerprint, userDataDir }` objects and document expected shape via comments (no TypeScript or JSDoc types).
- Never trust `req.body.userId`; use `req.user.id` set by the middleware.
- Errors returned to clients should be generic (`INTERNAL_ERROR`). Log full details server-side with clear prefixes (`[scraper]`, `[browser]`).

## Extending the Scraper
- Add DB/proxy lookups as inline `TODO` blocks in `routes/scraper.js` or extracted helpers under `services/` if multiple routes need them.
- When introducing new middleware, place it in `middleware/` and keep exports named (e.g., `{ requireCredits }`). Chain them in the route definition so Express ordering stays visible.
- If you add more Playwright customization (e.g., persistent contexts, storage state), add options to `initStealthBrowser` rather than duplicating launch logic elsewhere.
