const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('console', msg => console.log('Live page console:', msg.text()));

  await page.goto('http://localhost:3010/e/celestial-odyssey', { waitUntil: 'networkidle' });

  const bodyHtml = await page.evaluate(() => {
    const mainEl = document.querySelector('main');
    return {
      mainId: mainEl ? mainEl.id : 'no main',
      childCount: mainEl ? mainEl.children.length : 0,
      innerHTMLSnippet: document.body.innerHTML.slice(0, 1000)
    };
  });
  console.log('Body inspection:', bodyHtml);

  await browser.close();
}

run();
