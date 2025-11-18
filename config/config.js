const path = require('path');
const dotenv = require('dotenv');

// Load variables from .env when present (safe no-op in production containers).
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PORT = process.env.PORT || 4000;
const DADDY_LEADS_API_BASE = process.env.DADDY_LEADS_API_BASE || 'https://api.daddy-leads.com';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-before-production';

if (!process.env.JWT_SECRET) {
  console.warn('[config] JWT_SECRET is not set. Use a long, random value in production.');
}

const PLAYWRIGHT_DEFAULTS = {
  launchTimeout: Number(process.env.PLAYWRIGHT_LAUNCH_TIMEOUT || 60000),
  navigationTimeout: Number(process.env.PLAYWRIGHT_NAV_TIMEOUT || 45000)
};

const PLAYWRIGHT_HEADLESS = process.env.PLAYWRIGHT_HEADLESS === 'false' ? false : true;
const PLAYWRIGHT_KEEP_BROWSER_OPEN = process.env.PLAYWRIGHT_KEEP_BROWSER_OPEN === 'true';
const MONGODB_URI = process.env.MONGODB_URI || '';
const PROXY_DB_NAME = process.env.PROXY_DB_NAME || 'proxydb';
const PROXIES_COLLECTION = process.env.PROXIES_COLLECTION || 'proxies';
const PROXY_ASSIGNMENTS_COLLECTION = process.env.PROXY_ASSIGNMENTS_COLLECTION || 'assigned';

if (!MONGODB_URI) {
  console.warn('[config] MONGODB_URI is not set. Proxy assignment features will fail.');
}

module.exports = {
  PORT,
  DADDY_LEADS_API_BASE,
  JWT_SECRET,
  PLAYWRIGHT_DEFAULTS,
  PLAYWRIGHT_HEADLESS,
  PLAYWRIGHT_KEEP_BROWSER_OPEN,
  MONGODB_URI,
  PROXY_DB_NAME,
  PROXIES_COLLECTION,
  PROXY_ASSIGNMENTS_COLLECTION
};
