const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0,100)));
  await p.setViewport({ width: 1366, height: 800 });
  await p.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
  await p.type('#pin', '1234'); await p.click('#btn');
  await new Promise(r => setTimeout(r, 1600));
  await p.screenshot({ path: '/tmp/dash23.png' });
  console.log('stamp:', await p.evaluate(() => document.body.innerText.includes('الإصدار 23')), 'أخطاء:', errs.length ? errs : 'صفر');
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
