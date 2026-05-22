import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 730 });
  await page.goto('http://localhost:4028/dashboard');
  
  const root = await page.evaluate(() => {
    const el = document.querySelector('.dashboard-root');
    return el ? el.getBoundingClientRect().toJSON() : null;
  });
  
  const sidebar = await page.evaluate(() => {
    const el = document.querySelector('aside');
    return el ? el.getBoundingClientRect().toJSON() : null;
  });

  const bottomPanel = await page.evaluate(() => {
    const el = document.querySelector('aside > div:last-child');
    return el ? el.getBoundingClientRect().toJSON() : null;
  });

  console.log('Root:', root);
  console.log('Sidebar:', sidebar);
  console.log('Bottom Panel:', bottomPanel);
  
  await browser.close();
})();
