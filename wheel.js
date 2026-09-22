const puppeteer = require('puppeteer');
const BASE = process.argv[2];
const PAGES = process.argv[3].split(',');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/home/user/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], headless: 'shell' });
  for (const w of [800, 900, 1000, 1100, 1200, 1280, 1366]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: 800 });
    const hits = [];
    for (const pg of PAGES) {
      await p.goto(BASE + pg, { waitUntil: 'networkidle2' });
      if (pg === '/admin') { /* handled outside */ }
      await new Promise(r => setTimeout(r, 900));
      // عجلة أفقية بمنتصف الصفحة
      await p.mouse.move(w / 2, 400);
      const before = await p.evaluate(() => ({ x: window.scrollX, els: [...document.querySelectorAll('*')].filter(e => e.scrollLeft > 0).length }));
      await p.mouse.wheel({ deltaX: 240, deltaY: 0 });
      await new Promise(r => setTimeout(r, 400));
      const after = await p.evaluate(() => {
        const moved = [];
        if (window.scrollX !== 0) moved.push('WINDOW:' + window.scrollX);
        document.querySelectorAll('*').forEach(e => { if (e.scrollLeft > 0) moved.push((e.id || e.className.toString().slice(0, 14)) + ':' + Math.round(e.scrollLeft)); });
        return moved;
      });
      if (after.length) hits.push(`${pg}@${w}: ${after.join(',')}`);
      // رجّع
      await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach(e => e.scrollLeft = 0); });
    }
    console.log(`width ${w}:`, hits.length ? hits.join(' ;; ') : 'ما تحرك شي أفقيًا ✓');
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
