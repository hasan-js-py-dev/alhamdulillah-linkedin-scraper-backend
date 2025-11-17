const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('playwright-extra-plugin-stealth');
const { PLAYWRIGHT_DEFAULTS, PLAYWRIGHT_HEADLESS } = require('../config/config');

chromium.use(StealthPlugin());

async function initStealthBrowser(options = {}) {
  const { proxy, fingerprint = {}, userDataDir, headless } = options;
  const launchOptions = {
    headless: true,
    timeout: PLAYWRIGHT_DEFAULTS.launchTimeout,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  };
    const resolvedHeadless = typeof headless === 'boolean' ? headless : PLAYWRIGHT_HEADLESS;
    launchOptions.headless = resolvedHeadless;

  if (proxy && proxy.host && proxy.port) {
    launchOptions.proxy = {
      server: `${proxy.host}:${proxy.port}`
    };
    if (proxy.username && proxy.password) {
      launchOptions.proxy.username = proxy.username;
      launchOptions.proxy.password = proxy.password;
    }
  }

  let persistentDir;
  if (userDataDir) {
    persistentDir = path.resolve(userDataDir);
    await fs.promises.mkdir(persistentDir, { recursive: true });
  }

  const contextOptions = {
    viewport: fingerprint.viewport || { width: 1366, height: 768 },
    locale: fingerprint.locale || 'en-US',
    timezoneId: fingerprint.timezoneId || 'America/Los_Angeles'
  };

  if (fingerprint.userAgent) {
    contextOptions.userAgent = fingerprint.userAgent;
  }

  let browser;
  let context;
  try {
    if (persistentDir) {
      context = await chromium.launchPersistentContext(persistentDir, {
        ...launchOptions,
        viewport: contextOptions.viewport,
        locale: contextOptions.locale,
        timezoneId: contextOptions.timezoneId,
        userAgent: contextOptions.userAgent
      });
      browser = context.browser();
    } else {
      browser = await chromium.launch(launchOptions);
      context = await browser.newContext(contextOptions);
    }
    context.setDefaultNavigationTimeout(PLAYWRIGHT_DEFAULTS.navigationTimeout);
    const page = await context.newPage();

    return { browser, context, page };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    console.error('[browser] Failed to launch stealth browser', error);
    throw new Error('Unable to initialize stealth browser instance');
  }
}

module.exports = { initStealthBrowser };
