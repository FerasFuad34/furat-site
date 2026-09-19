#!/usr/bin/env node
/* يولّد نسخة HTML واحدة مستقلة (كل شي داخلها) — للفتح من الجوال بدون سيرفر */
const fs = require('fs'), path = require('path');
const R = require('../lib/render');
const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const b64 = p => 'data:' + (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + ';base64,' + fs.readFileSync(path.join(ROOT, p)).toString('base64');

let html = R.pages.home(data);
html = html.replace('<link rel="stylesheet" href="/assets/css/style.css?v=31">', '<style>\n' + read('public/assets/css/style.css') + '\n</style>');
html = html.replace('<script src="/assets/js/art.js?v=31" defer></script>', '<script>\n' + read('public/assets/js/art.js') + '\n</script>');
html = html.replace('<script src="/assets/js/app.js?v=31" defer></script>', '<script>\n' + read('public/assets/js/app.js') + '\n</script>');
html = html.replace('<link rel="manifest" href="/manifest.webmanifest">\n', '');
html = html.replace('href="/assets/favicon.png"', 'href="' + b64('public/assets/favicon.png') + '"');
html = html.replace('href="/assets/logo/icon-192.png"', 'href="' + b64('public/assets/logo/icon-192.png') + '"');
for (const f of ['logo-full.png', 'logo-symbol.png', 'logo-lockup.png', 'logo-lockup-t.png', 'favicon.png', 'icon-192.png', 'icon-512.png', 'logo-full-1200.png']) {
  html = html.split('/assets/logo/' + f).join(b64('public/assets/logo/' + f));
}
html = html.replace('content="/assets/logo/logo-full-1200.png"', 'content=""');
// أي مراجع متبقية لملفات خارجية تُنظّف
html = html.split('/assets/logo/logo-full-1200.png').join(b64('public/assets/logo/logo-full-1200.png'));
// صور المنتجات + الصور المرفوعة من اللوحة (مجلدات كاملة)
for (const dir of ['products', 'uploads']) {
  const full = path.join(ROOT, 'public', 'assets', dir);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full)) {
    const u = '/assets/' + dir + '/' + f;
    if (html.includes(u)) html = html.split(u).join(b64('public' + u));
  }
}
// الشعار المخصص المرفوع من اللوحة (إن وجد)
for (const k of ['logoUrl', 'logoFullUrl']) {
  const u = (data.settings || {})[k];
  if (u && u.startsWith('/assets/') && fs.existsSync(path.join(ROOT, 'public' + u))) {
    html = html.split(u).join(b64('public' + u));
  }
}

const out = path.join(ROOT, '..', 'الفرات_الحلوة_الرياض', 'الموقع_نسخة_مستقلة.html');
fs.writeFileSync(out, html);
console.log('✅ تولّدت:', out, (html.length / 1024).toFixed(0) + 'KB');
const left = html.match(/(src|href)="\/assets\/[^"]+"/g) || [];
console.log(left.length ? '⚠️ مراجع خارجية متبقية: ' + [...new Set(left)].join(' , ') : '✔ لا مراجع خارجية متبقية');
