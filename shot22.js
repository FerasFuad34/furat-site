const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  const p = await b.newPage();
  await p.setViewport({ width: 768, height: 900 });
  await p.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
  await p.type('#pin', '1234'); await p.click('#btn');
  await new Promise(r => setTimeout(r, 1400));
  await p.click('#nav a[data-t="cust"]'); await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: '/tmp/w768-cust.png' });
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
