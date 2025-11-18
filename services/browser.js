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
      '--disable-infobars',
      '--test-type'
    ],
    ignoreDefaultArgs: ['--enable-automation', '--no-sandbox'],
    env: {
      ...process.env,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'na',
      GOOGLE_DEFAULT_CLIENT_ID: process.env.GOOGLE_DEFAULT_CLIENT_ID || 'na',
      GOOGLE_DEFAULT_CLIENT_SECRET: process.env.GOOGLE_DEFAULT_CLIENT_SECRET || 'na'
    }
  };
  const extensionPaths = discoverExtensionDirectories();
  const resolvedHeadless = typeof headless === 'boolean' ? headless : PLAYWRIGHT_HEADLESS;
  launchOptions.headless = resolvedHeadless;

  if (extensionPaths.length) {
    if (launchOptions.headless) {
      console.warn('[browser] Extensions require headful mode. Forcing headless=false.');
      launchOptions.headless = false;
    }

    const extensionArg = formatExtensionArg(extensionPaths);
    launchOptions.args.push(`--disable-extensions-except=${extensionArg}`);
    launchOptions.args.push(`--load-extension=${extensionArg}`);
  }

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

  const contextOptions = buildContextOptions(fingerprint);
  logBrowserConfiguration({
    contextOptions,
    extensionPaths,
    proxy: launchOptions.proxy,
    fingerprint
  });

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
    const bootPages = context.pages();
    let page;
    if (bootPages.length) {
      page = bootPages[bootPages.length - 1];
      if (bootPages.length > 1) {
        const pagesToClose = bootPages.slice(0, -1);
        await Promise.all(pagesToClose.map(async (bootPage) => {
          try {
            await bootPage.close();
          } catch (err) {
            console.warn('[browser] Failed to close startup page', err.message);
          }
        }));
      }
    } else {
      page = await context.newPage();
    }

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

function buildContextOptions(fingerprint) {
  const viewport = fingerprint.viewport || pickViewport(fingerprint);
  const locale = fingerprint.locale || fingerprint.language || 'en-US';
  const timezoneId = fingerprint.timezoneId || fingerprint.timezone || 'America/Los_Angeles';

  const options = {
    viewport,
    locale,
    timezoneId
  };

  if (fingerprint.userAgent) {
    options.userAgent = fingerprint.userAgent;
  }

  return options;
}

function discoverExtensionDirectories() {
  const extensionsRoot = path.resolve(process.cwd(), 'extensions');
  try {
    const entries = fs.readdirSync(extensionsRoot, { withFileTypes: true });
    return entries
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => path.join(extensionsRoot, dirent.name));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[browser] Failed to read extensions directory', error.message);
    }
    return [];
  }
}

function formatExtensionArg(paths) {
  return paths
    .map((extPath) => extPath.replace(/,/g, ''))
    .map((extPath) => (extPath.includes(' ') ? `"${extPath}"` : extPath))
    .join(',');
}

function pickViewport(fingerprint) {
  const widthCandidate = (fingerprint.viewport && fingerprint.viewport.width) || fingerprint.width || fingerprint.screenWidth;
  const heightCandidate = (fingerprint.viewport && fingerprint.viewport.height) || fingerprint.height || fingerprint.screenHeight;
  const width = Number(widthCandidate);
  const height = Number(heightCandidate);
  if (width && height) {
    return { width, height };
  }
  return { width: 1366, height: 768 };
}

function logBrowserConfiguration({ contextOptions, extensionPaths, proxy, fingerprint }) {
  const summary = {
    userAgent: contextOptions.userAgent || 'default',
    viewport: contextOptions.viewport,
    locale: contextOptions.locale,
    timezoneId: contextOptions.timezoneId,
    extensions: extensionPaths.map((extPath) => path.basename(extPath)),
    proxy: proxy ? { server: proxy.server } : null
  };

  console.info('[browser] Launch fingerprint summary', summary);
  if (fingerprint && Object.keys(fingerprint).length) {
    console.info('[browser] Launch fingerprint source', fingerprint);
  } else {
    console.info('[browser] Launch fingerprint source', 'No fingerprint provided; using defaults');
  }
}
