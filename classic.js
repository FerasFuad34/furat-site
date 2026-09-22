const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: true });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
  const sbw = await p.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
  console.log('عرض السكرول الكلاسيكي هنا:', sbw, 'px');
  await p.type('#pin', '1234'); await p.click('#btn');
  await new Promise(r => setTimeout(r, 1500));
  for (const w of [1280, 1366, 1440]) {
    await p.setViewport({ width: w, height: 800 });
    for (const t of ['products', 'cust']) {
      await p.click(`#nav a[data-t="${t}"]`); await new Promise(r => setTimeout(r, 400));
      const s = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) out.push((el.id || el.className.toString().slice(0, 12)) + ':' + el.scrollWidth + '>' + el.clientWidth); });
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push('DOC');
        return out;
      });
      console.log(`@${w} ${t}:`, s.length ? s.join(',') : '✓');
    }
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
