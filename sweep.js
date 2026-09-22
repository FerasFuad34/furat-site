const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  for (const dsf of [1.25, 1.5]) {
    const p = await b.newPage();
    await p.setViewport({ width: 1366, height: 800, deviceScaleFactor: dsf });
    await p.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
    await p.type('#pin', '1234'); await p.click('#btn');
    await new Promise(r => setTimeout(r, 1500));
    for (const t of ['dash', 'products', 'cust']) {
      await p.click(`#nav a[data-t="${t}"]`); await new Promise(r => setTimeout(r, 300));
      const bad = [];
      for (let w = 600; w <= 1920; w += 8) {
        await p.setViewport({ width: w, height: 800, deviceScaleFactor: dsf });
        await new Promise(r => setTimeout(r, 60));
        const r = await p.evaluate(() => {
          let over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          document.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) over += 1; });
          return over;
        });
        if (r > 0) bad.push(w);
      }
      console.log(`dsf ${dsf} — ${t}:`, bad.length ? 'فيض عند عروض: ' + bad.join(',') : 'نظيف بكل العروض 600→1920 ✓');
    }
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
