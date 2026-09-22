const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'http://localhost:3000';
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  for (const w of [600, 700, 768, 800, 900, 1000, 1100, 1200, 1280, 1366, 1536, 1920]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: 800 });
    await p.goto(BASE + '/admin/login', { waitUntil: 'networkidle2' });
    await p.type('#pin', '1234'); await p.click('#btn');
    await new Promise(r => setTimeout(r, 1500));
    const hits = [];
    for (const t of ['dash', 'settings', 'hours', 'products', 'categories', 'services', 'faqs', 'cust', 'stats']) {
      await p.click(`#nav a[data-t="${t}"]`); await new Promise(r => setTimeout(r, 350));
      for (const y of [300, 500, 650]) {
        await p.mouse.move(w / 2, y);
        await p.mouse.wheel({ deltaX: 240, deltaY: 0 });
        await new Promise(r => setTimeout(r, 250));
        const moved = await p.evaluate(() => {
          const m = [];
          if (window.scrollX !== 0) m.push('WINDOW:' + window.scrollX);
          document.querySelectorAll('*').forEach(e => { if (e.scrollLeft > 0) m.push((e.id || e.className.toString().slice(0, 14)) + ':' + Math.round(e.scrollLeft)); });
          return m;
        });
        if (moved.length) { hits.push(`${t}@y${y}:${moved.join(',')}`); await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach(e => e.scrollLeft = 0); }); }
      }
    }
    console.log(`@${w}:`, hits.length ? hits.join(' ;; ') : 'ما تحرك شي أفقيًا ✓');
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
