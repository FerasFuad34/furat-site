const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  for (const w of [600, 700, 768, 800, 900, 950, 1024, 1100, 1200, 1280, 1366, 1440, 1536, 1920]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: 800 });
    await p.goto('https://furat-alhalo.onrender.com/admin/login', { waitUntil: 'networkidle2' });
    await p.type('#pin', '1234'); await p.click('#btn');
    await new Promise(r => setTimeout(r, 1500));
    const hits = [];
    for (const t of ['dash', 'products', 'cust']) {
      await p.click(`#nav a[data-t="${t}"]`); await new Promise(r => setTimeout(r, 350));
      for (const y of [350, 550]) {
        await p.mouse.move(w / 2, y);
        await p.mouse.wheel({ deltaX: 240, deltaY: 0 });
        await new Promise(r => setTimeout(r, 200));
        const m = await p.evaluate(() => { const r = []; if (window.scrollX !== 0) r.push('WIN'); document.querySelectorAll('*').forEach(e => { if (e.scrollLeft > 0) r.push(e.id || e.className.toString().slice(0, 10)); }); return r; });
        if (m.length) hits.push(`${t}@${y}:${m.join(',')}`);
        await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach(e => e.scrollLeft = 0); });
      }
    }
    console.log(`LIVE @${w}:`, hits.length ? hits.join(' ;; ') : 'ثابت ✓');
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
