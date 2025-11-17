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

module.exports = {
  PORT,
  DADDY_LEADS_API_BASE,
  JWT_SECRET,
  PLAYWRIGHT_DEFAULTS,
  PLAYWRIGHT_HEADLESS,
  PLAYWRIGHT_KEEP_BROWSER_OPEN
};
