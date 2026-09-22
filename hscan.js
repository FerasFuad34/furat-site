const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'http://localhost:3000';
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  for (const w of [1009, 1083, 1213, 1265, 1351, 1425, 1707, 1905]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: 800 });
    await p.goto(BASE + '/admin/login', { waitUntil: 'networkidle2' });
    await p.type('#pin', '1234'); await p.click('#btn');
    await new Promise(r => setTimeout(r, 1800));
    const found = [];
    for (const t of ['dash', 'settings', 'hours', 'products', 'categories', 'services', 'faqs', 'cust', 'stats']) {
      await p.click(`#nav a[data-t="${t}"]`); await new Promise(r => setTimeout(r, 450));
      const r = await p.evaluate(() => {
        const out = [];
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push('DOC:' + document.documentElement.scrollWidth + '>' + document.documentElement.clientWidth);
        document.querySelectorAll('*').forEach(el => {
          const cs = getComputedStyle(el);
          if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2)
            out.push((el.id || el.className.toString().slice(0, 16)) + ' ' + el.scrollWidth + '>' + el.clientWidth);
        });
        return out;
      });
      if (r.length) found.push(`${t}: ${r.join(' , ')}`);
    }
    console.log(`@${w}:`, found.length ? found.join(' ;; ') : 'لا يوجد أي ساحب أفقي ✓');
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
