const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  for (const w of [600, 700, 768, 800, 900, 950]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: 800 });
    // login page overflow
    await p.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
    const lg = await p.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push('DOC' + document.documentElement.scrollWidth + '>' + document.documentElement.clientWidth);
      document.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) out.push((el.id || el.className.toString().slice(0, 12)) + ':' + el.scrollWidth + '>' + el.clientWidth); });
      return out;
    });
    await p.type('#pin', '1234'); await p.click('#btn');
    await new Promise(r => setTimeout(r, 1400));
    const res = [];
    for (const t of ['products', 'cust']) {
      await p.click(`#nav a[data-t="${t}"]`); await new Promise(r => setTimeout(r, 400));
      const s = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) out.push((el.id || el.className.toString().slice(0, 12)) + ':' + el.scrollWidth + '>' + el.clientWidth); });
        return out;
      });
      if (s.length) res.push(`${t}:${s.join(',')}`);
    }
    console.log(`@${w}: login[${lg.join(',') || '✓'}] tabs[${res.join(' ;; ') || '✓'}]`);
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
