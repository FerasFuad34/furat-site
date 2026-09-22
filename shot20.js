const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  const p = await b.newPage();
  await p.setViewport({ width: 1100, height: 800 });
  await p.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
  await p.type('#pin', '1234'); await p.click('#btn');
  await new Promise(r => setTimeout(r, 1500));
  await p.click('#nav a[data-t="cust"]'); await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: '/tmp/w1100-cust.png' });
  await p.click('#nav a[data-t="products"]'); await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: '/tmp/w1100-prod.png' });
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
