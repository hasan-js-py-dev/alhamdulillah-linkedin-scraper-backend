const fs = require('fs');
const path = require('path');
const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { initStealthBrowser } = require('../services/browser');
const { PLAYWRIGHT_KEEP_BROWSER_OPEN } = require('../config/config');

const router = express.Router();

router.post('/salesnav/start', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  let browser;
  let context;
  let page;

  try {
    // TODO: check credits for userId and throw if not enough.
    // TODO: assign proxy + fingerprint based on proxydb.* collections.
    const proxyConfig = null; // Replace with real proxy assignment result.
    const fingerprint = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles'
    };

    const tempProfileDir = path.join(process.cwd(), 'temp-profiles', `user_${userId}_${Date.now()}`);
    await fs.promises.mkdir(tempProfileDir, { recursive: true });

    ({ browser, context, page } = await initStealthBrowser({
      proxy: proxyConfig,
      fingerprint,
      userDataDir: tempProfileDir
    }));

    await page.goto('https://www.google.com', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    return res.json({
      success: true,
      message: 'Sales Navigator scraper demo started successfully.',
      userId
    });
  } catch (error) {
    console.error('[scraper] Failed to start Sales Navigator scraper', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start scraper.',
      error: 'INTERNAL_ERROR'
    });
  } finally {
    if (browser && !PLAYWRIGHT_KEEP_BROWSER_OPEN) {
      await browser.close().catch((closeErr) => {
        console.error('[scraper] Failed to close browser', closeErr);
      });
    }
  }
});

module.exports = router;
