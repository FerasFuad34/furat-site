'use strict';
/* =========================================================
   الفرات الحلو لتحلية المياه — الخادم
   Express + تخزين JSON + لوحة تحكم ديناميكية
   ========================================================= */
const express = require('express');
const QR = require('qrcode');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const R = require('./lib/render');
const ART_PATH = path.join(__dirname, 'public/assets/js/art.js');

/* توليد ملف الرسوم التوضيحية للمنتجات (يُخزَّن مرة واحدة بدل تكراره في كل صفحة) */
function buildArt() {
  try {
    const d = R.D();
    const art = R.artMap(d);
    fs.writeFileSync(ART_PATH, 'window.FS_ART=' + JSON.stringify(art).replace(/<\//g, '<\\/') + ';', 'utf8');
    return true;
  } catch (e) { console.error('buildArt failed:', e.message); return false; }
}
buildArt();
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const GHSYNC = require('./lib/ghsync');
const DATA_PATH = path.join(__dirname, 'data.json');

/* ---------- أمان لوحة التحكم ----------
   المصادقة بالتوكن عبر الهيدر أو الكوكي أو الرابط —
   تشتغل حتى داخل إطارات المعاينة اللي تحجب الكوكيز.
   رمز الدخول يتغيّر من داخل اللوحة ويُحفظ مبسّطاً (hash) في admin-auth.json */
const AUTH_PATH = path.join(__dirname, 'admin-auth.json');
const DEFAULT_PIN = process.env.FH_PIN || '1234';
const COOKIE = 'fh_admin';
const hashPin = p => crypto.createHash('sha256').update('furat::' + String(p)).digest('hex');
function pinHash() {
  try { const a = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8')); if (a && a.pinHash) return a.pinHash; } catch (e) {}
  return hashPin(DEFAULT_PIN);
}
const isDefaultPin = () => { try { fs.accessSync(AUTH_PATH); return false; } catch (e) { return true; } };
const sign = v => crypto.createHmac('sha256', pinHash() + '::fh').update(v).digest('hex').slice(0, 32);
const token = () => { const v = String(Date.now()); return v + '.' + sign(v); };
const valid = t => {
  if (!t || typeof t !== 'string' || !t.includes('.')) return false;
  const [v, s] = t.split('.');
  if (s !== sign(v)) return false;
  return Date.now() - Number(v) < 1000 * 60 * 60 * 12; // 12 ساعة
};
const reqToken = req => {
  const h = req.headers['x-fh-token'] || req.headers['authorization'] || '';
  if (typeof h === 'string' && h) return h.startsWith('Bearer ') ? h.slice(7) : h;
  if (req.query && req.query.t) return String(req.query.t);
  const raw = req.headers.cookie || '';
  const m = raw.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : '';
};
const isAdmin = req => valid(reqToken(req));

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));

/* ---------- ملفات ثابتة ---------- */
app.use('/assets', express.static(path.join(__dirname, 'public/assets'), { maxAge: '1h' }));
const UPLOAD_DIR = path.join(__dirname, 'public', 'assets', 'uploads');
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) {}
app.use('/assets/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

/* ---------- PWA ---------- */
app.get('/manifest.webmanifest', (req, res) => {
  const s = R.D().settings;
  res.type('application/manifest+json').json({
    name: s.nameFull,
    short_name: s.name,
    description: s.heroText.slice(0, 120),
    lang: 'ar', dir: 'rtl', scope: '/', start_url: '/', display: 'standalone',
    background_color: '#F6FBFD', theme_color: '#073B57',
    icons: [
      { src: '/assets/logo/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/assets/logo/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  });
});

app.get('/sw.js', (req, res) => {
  res.type('application/javascript').send(`
const C='furat-v11';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET') return;
  if(u.pathname.startsWith('/admin')||u.pathname.startsWith('/api')) return;
  if(u.pathname.startsWith('/assets')){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const c=n.clone();caches.open(C).then(x=>x.put(e.request,c));return n}).catch(()=>caches.match('/assets/offline.html'))));
    return;
  }
  e.respondWith(fetch(e.request).catch(()=>caches.match('/assets/offline.html')));
});`);
});

/* ---------- SEO ---------- */
app.get('/robots.txt', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nSitemap: ${base}/sitemap.xml\n`);
});
app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const d = R.D();
  const urls = ['/', '/products', '/services', '/about', '/contact']
    .concat(d.products.map(p => `/product/${p.id}`));
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${base}${u}</loc><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`);
});

/* ---------- تحليلات خفيفة ذاتية (عدّاد زيارات لكل صفحة/يوم) ---------- */
const STATS_PATH = path.join(__dirname, 'stats.json');
let STATS = null, STATS_DIRTY = false, STATS_FLUSH = null;
const statsLoad = () => { if (!STATS) { try { STATS = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8')); } catch (e) { STATS = { pages: {} }; } } return STATS; };
const statsFlush = () => { if (STATS_DIRTY && STATS) { try { fs.writeFileSync(STATS_PATH, JSON.stringify(STATS)); STATS_DIRTY = false; } catch (e) {} } };
setInterval(statsFlush, 15000).unref ? setInterval(statsFlush, 15000).unref() : null;
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/assets') && !req.path.startsWith('/api') && !req.path.startsWith('/admin') && !req.path.startsWith('/sw.js')) {
    const st = statsLoad(); const day = new Date().toISOString().slice(0, 10);
    const key = req.path === '/' ? '/' : req.path.replace(/\/+$/, '');
    const e = st.pages[key] || (st.pages[key] = { total: 0, days: {} });
    e.total++; e.days[day] = (e.days[day] || 0) + 1; STATS_DIRTY = true;
    if (!STATS_FLUSH) { STATS_FLUSH = setTimeout(statsFlush, 15000); }
  }
  next();
});
app.get('/api/admin/stats', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  const st = statsLoad();
  const days = {};
  Object.values(st.pages).forEach(p => Object.entries(p.days || {}).forEach(([d, n]) => { days[d] = (days[d] || 0) + n; }));
  const top = Object.entries(st.pages).map(([path, v]) => ({ path, total: v.total })).sort((a, b) => b.total - a.total).slice(0, 12);
  res.json({ total: Object.values(st.pages).reduce((a, p) => a + p.total, 0), byDay: Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14), top });
});

/* ---------- الصفحات ---------- */
app.set('trust proxy', true);
/* يكمل روابط SEO (canonical / og:url / og:image) بالنطاق الكامل — مهم للاستضافة ومحركات البحث */
const absMeta = (html, req) => {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  if (!host) return html;
  const origin = proto + '://' + host;
  const url = origin + req.originalUrl.split('?')[0];
  html = html.replace(/content="\/assets\//g, 'content="' + origin + '/assets/');
  if (!/rel="canonical"/.test(html)) {
    html = html.replace('</head>', '<link rel="canonical" href="' + url + '">\n<meta property="og:url" content="' + url + '">\n</head>');
  }
  return html;
};
const sendPage = (req, res, html) => res.set('Cache-Control', 'no-cache').send(absMeta(html, req));

app.get('/', (req, res) => sendPage(req, res, R.pages.home(R.D())));

app.get('/products', (req, res) => sendPage(req, res, R.pages.products(R.D(), req.query)));

app.get('/product/:id', (req, res) => {
  const d = R.D();
  const p = d.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).send(R.pages.notFound(d));
  sendPage(req, res, R.pages.product(d, p));
});

app.get('/services', (req, res) => sendPage(req, res, R.pages.services(R.D())));
/* صفحات حُذفت في التنظيف النهائي — تحويل دائم للرئيسية */
app.get(['/packages', '/tools', '/blog', '/blog/:id'], (req, res) => res.redirect(301, '/'));
app.get('/about', (req, res) => sendPage(req, res, R.pages.about(R.D())));
app.get('/contact', (req, res) => sendPage(req, res, R.pages.contact(R.D())));

/* ---------- API (للقراءة من أي تطبيق مستقبلاً) ---------- */
app.get('/api/data', (req, res) => res.json(R.D()));

/* ---------- لوحة التحكم ---------- */
app.get('/admin', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.send(fs.readFileSync(path.join(__dirname, 'admin/index.html'), 'utf8'));
});
app.get('/admin/login', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.send(fs.readFileSync(path.join(__dirname, 'admin/login.html'), 'utf8'));
});

app.post('/admin/login', (req, res) => {
  const pin = String((req.body && req.body.pin) || '').trim();
  if (pin && hashPin(pin) === pinHash()) {
    const t = token();
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(t)}; Path=/; Max-Age=43200; SameSite=Lax`);
    return res.json({ ok: true, token: t });
  }
  res.status(401).json({ ok: false, error: 'bad-pin' });
});

app.all('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
  res.json({ ok: true });
});

/* حالة الأمان: هل ما زال الرمز الافتراضي؟ */
app.get('/api/admin/meta', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ defaultPin: isDefaultPin() });
});

/* ---------- النسخ الاحتياطي (خاص باللوحة) ---------- */
app.get('/api/admin/backup', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ active: !!GHSYNC.ACTIVE, last: GHSYNC.getLastPush ? GHSYNC.getLastPush() : null });
});
app.post('/api/admin/backup', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  Promise.all([GHSYNC.pushFile('data.json', DATA_PATH), GHSYNC.pushFile('customers.json', CUST_PATH)])
    .then(r => res.json({ ok: r.every(Boolean), last: new Date().toISOString() }))
    .catch(e => res.status(500).json({ ok: false, error: String(e.message || e) }));
});
app.post('/api/admin/restore', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body || {};
  try {
    if (b.data && typeof b.data === 'object' && b.data.settings && Array.isArray(b.data.products)) {
      fs.copyFileSync(DATA_PATH, DATA_PATH + '.bak');
      fs.writeFileSync(DATA_PATH, JSON.stringify(b.data, null, 2), 'utf8');
      GHSYNC.backup('data.json', DATA_PATH);
    }
    if (b.customers && typeof b.customers === 'object' && Array.isArray(b.customers.customers)) {
      fs.copyFileSync(CUST_PATH, CUST_PATH + '.bak');
      fs.writeFileSync(CUST_PATH, JSON.stringify(b.customers, null, 2), 'utf8');
      GHSYNC.backup('customers.json', CUST_PATH);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
});

/* ---------- سجل العملاء وتذكيرات الصيانة (خاص باللوحة — لا يُنشر أبداً) ---------- */
const CUST_PATH = path.join(__dirname, 'customers.json');
const readCust = () => {
  try { return JSON.parse(fs.readFileSync(CUST_PATH, 'utf8')); }
  catch (e) { return { cycles: { pre: 6, post: 12, membrane: 24 }, customers: [] }; }
};
app.get('/api/admin/customers', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json(readCust());
});
app.post('/api/admin/customers', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body || {};
  if (!b || !Array.isArray(b.customers)) return res.status(400).json({ error: 'bad payload' });
  const next = {
    cycles: Object.assign({ pre: 6, post: 12, membrane: 24 }, b.cycles || {}),
    customers: b.customers
  };
  try {
    fs.copyFileSync(CUST_PATH, CUST_PATH + '.bak');
    fs.writeFileSync(CUST_PATH, JSON.stringify(next, null, 2), 'utf8');
    GHSYNC.backup('customers.json', CUST_PATH);
    res.json({ ok: true, saved: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

/* تغيير رمز الدخول من داخل اللوحة */
app.post('/api/admin/pin', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  const np = String((req.body && req.body.pin) || '').trim();
  if (!/^\d{4,8}$/.test(np)) return res.status(400).json({ error: 'الرمز لازم يكون من 4 إلى 8 أرقام' });
  try {
    fs.writeFileSync(AUTH_PATH, JSON.stringify({ pinHash: hashPin(np), changed: new Date().toISOString() }, null, 2));
    GHSYNC.backup('admin-auth.json', AUTH_PATH);
    res.json({ ok: true, token: token() }); // توكن جديد لأن التوقيع تغيّر
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.get('/api/admin/data', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json(R.D());
});

app.post('/api/admin/save', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') return res.status(400).json({ error: 'bad payload' });
  const cur = R.D();
  // ادمج الحقول المعروفة فقط
  const next = {
    settings: Object.assign({}, cur.settings, incoming.settings || {}),
    categories: Array.isArray(incoming.categories) ? incoming.categories : cur.categories,
    products: Array.isArray(incoming.products) ? incoming.products : cur.products,
    services: Array.isArray(incoming.services) ? incoming.services : cur.services,
    packages: Array.isArray(incoming.packages) ? incoming.packages : cur.packages,
    testimonials: Array.isArray(incoming.testimonials) ? incoming.testimonials : cur.testimonials,
    faqs: Array.isArray(incoming.faqs) ? incoming.faqs : cur.faqs,
    posts: Array.isArray(incoming.posts) ? incoming.posts : (cur.posts || [])
  };
  try {
    fs.copyFileSync(DATA_PATH, DATA_PATH + '.bak');
    fs.writeFileSync(DATA_PATH, JSON.stringify(next, null, 2), 'utf8');
    buildArt();
    GHSYNC.backup('data.json', DATA_PATH);
    res.json({ ok: true, saved: new Date().toISOString(), art: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});


/* ---------- رفع صور المنتجات (للوحة فقط) ---------- */
const upStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, 'p' + Date.now() + Math.floor(Math.random() * 999) + (['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg'));
  }
});
const upload = multer({ storage: upStorage, limits: { fileSize: 4 * 1024 * 1024 } });
app.post('/api/admin/upload', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  upload.single('img')(req, res, err => {
    if (err) return res.status(400).json({ error: 'الملف كبير أو غير صالح (الحد 4MB)' });
    if (!req.file) return res.status(400).json({ error: 'ما وصل ملف' });
    GHSYNC.backup('public/assets/uploads/' + req.file.filename, path.join(UPLOAD_DIR, req.file.filename));
    res.json({ ok: true, url: '/assets/uploads/' + req.file.filename });
  });
});

/* ---------- بطاقة منتج بطباعة QR (تُعلق على الرف/تطبع كرت) ---------- */
app.get('/admin/card/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).type('html').send('<h1 dir="rtl">يلزم الدخول من اللوحة</h1>');
  const d = R.D();
  const p = d.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).send('غير موجود');
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  const url = proto + '://' + host + '/product/' + p.id;
  const qr = await QR.toDataURL(url, { margin: 1, width: 300, color: { dark: '#073B57', light: '#FFFFFF' } });
  res.type('html').send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>بطاقة ${p.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{font-family:'Tajawal',Tahoma,sans-serif;background:#EEF4F8;padding:24px;display:flex;flex-wrap:wrap;gap:18px;justify-content:center}
  .card{width:90mm;height:54mm;background:#fff;border:1.2px solid #073B57;border-radius:5mm;padding:5mm 6mm;display:flex;gap:5mm;align-items:center;position:relative;overflow:hidden}
  .card::before{content:'';position:absolute;inset-inline-start:0;top:0;bottom:0;width:2.5mm;background:#E8A33D}
  .txt{flex:1;display:flex;flex-direction:column;gap:1.5mm}
  .brand{font-family:'Cairo';font-weight:900;color:#073B57;font-size:11pt;line-height:1.2}
  .brand i{display:block;font-style:normal;font-weight:700;color:#1478A0;font-size:7.5pt}
  .name{font-weight:700;color:#0E2233;font-size:10pt;line-height:1.35;margin-top:1mm}
  .price{font-family:'Cairo';font-weight:900;color:#073B57;font-size:15pt}.price span{font-size:8pt;font-weight:700;color:#5A7184}
  .url{font-size:6.6pt;color:#5A7184;direction:ltr;text-align:right;margin-top:auto}
  .qr{width:30mm;height:30mm;flex:none}
  .qr img{width:100%;height:100%;display:block}
  .qr b{display:block;text-align:center;font-size:6.6pt;color:#1478A0;font-weight:700;margin-top:1mm}
  .acts{width:100%;text-align:center}
  button{font-family:'Cairo';font-weight:800;background:#073B57;color:#fff;border:0;border-radius:10px;padding:10px 26px;cursor:pointer;font-size:11pt}
  @media print{body{background:#fff;padding:0;gap:0}.acts{display:none}.card{page-break-inside:avoid;margin:0 auto;border-color:#073B57}}
</style></head><body>
  <div class="card">
    <div class="txt">
      <div class="brand">${d.settings.nameFull}<i>بيع • تركيب • صيانة</i></div>
      <div class="name">${p.name}</div>
      <div class="price">${Number(p.price).toLocaleString('en-US')} <span>ريال</span></div>
      <div class="url">${host}/product/${p.id}</div>
    </div>
    <div class="qr"><img src="${qr}" alt="QR"><b>امسح للتفاصيل والطلب</b></div>
  </div>
  <div class="acts"><button onclick="window.print()">🖨 طباعة البطاقة</button></div>
</body></html>`);
});

/* ---------- تصدير نسخة مستقلة (ملف HTML واحد يفتح بدون سيرفر) ---------- */
app.get('/admin/export', (req, res) => {
  if (!isAdmin(req)) return res.status(401).type('html').send('<h1 dir="rtl">يلزم الدخول من <a href="/admin">لوحة التحكم</a></h1>');
  try {
    const d = R.D();
    const art = R.artMap(d);
    const css = fs.readFileSync(path.join(__dirname, 'public/assets/css/style.css'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, 'public/assets/js/app.js'), 'utf8');
    const pages = { '': 'home', products: 'products', services: 'services', packages: 'packages', tools: 'tools', about: 'about', contact: 'contact' };

    let html = R.pages.home(d);

    // 1) ادمج CSS بدل الرابط الخارجي
    html = html.replace(/<link rel="stylesheet" href="\/assets\/css\/style\.css[^"]*">/, () => '<style>' + css + '</style>');

    // 2) ادمج بيانات الموقع والرسوم
    const fsObj = JSON.stringify({ products: d.products, categories: d.categories, settings: d.settings }).replace(/<\//g, '<\\/');
    const artObj = JSON.stringify(art).replace(/<\//g, '<\\/');
    html = html.replace(/<script src="\/assets\/js\/art\.js[^"]*" defer><\/script>/, '');
    html = html.replace(/<script src="\/assets\/js\/app\.js[^"]*" defer><\/script>/,
      () => '<script>window.FS=' + fsObj + ';window.FS_ART=' + artObj + ';window.FH_STANDALONE=true;</script><script>' + js + '</script>');

    // 3) حوّل الروابط الداخلية إلى أزرار تنقّل بين الصفحات المدمجة
    html = html.replace(/href="\/(products|services|packages|tools|about|contact)(\?[^"]*)?"/g, 'href="#" data-goto="$1"');
    html = html.replace(/href="\/"/g, 'href="#" data-goto="home"');
    html = html.replace(/<a class="skip" href="#main">/, '<a class="skip" href="#main" data-skip>');
    // تضمين الشعار كـ data URI حتى يعمل الملف منفرداً تماماً
    const logoDir = path.join(__dirname, 'public/assets/logo');
    const b64 = f => 'data:image/' + (f.endsWith('.svg') ? 'svg+xml' : 'png') + ';base64,' + fs.readFileSync(path.join(logoDir, f)).toString('base64');
    const embed = h => h.replace(/(src|href)="\/assets\/(logo\/[^"]+|favicon\.png)"/g, (m, attr, f) => {
      const file = f.replace(/^logo\//, '');
      const real = f.startsWith('logo/') ? path.join(logoDir, file) : path.join(__dirname, 'public/assets', file);
      if (!fs.existsSync(real)) return m;
      const mime = real.endsWith('.svg') ? 'svg+xml' : 'png';
      return attr + '="data:image/' + mime + ';base64,' + fs.readFileSync(real).toString('base64') + '"';
    });
    html = embed(html);

    // 4) أضف بقية الصفحات مخفية + سكربت التنقل
    const others = Object.keys(pages).filter(k => k && k !== 'products' ? true : true).filter(k => k !== '');
    const store = {};
    ['products', 'services', 'packages', 'tools', 'about', 'contact'].forEach(k => {
      let sub = R.pages[pages[k]](d, {});
      sub = sub.replace(/<link rel="stylesheet" href="\/assets\/css\/style\.css[^"]*">/, '');
      sub = sub.replace(/<script src="\/assets\/js\/(art|app)\.js[^"]*" defer><\/script>/g, '');
      const m1 = sub.indexOf('<main id="main">');
      const m2 = sub.indexOf('</main>', m1);
      store[k] = embed(sub.slice(m1 + 15, m2));
    });
    const navScript = `
<div id="fhPages" style="display:none">${Object.entries(store).map(([k, v]) => `<div data-page="${k}" hidden>${v}</div>`).join('')}</div>
<script>
(function(){
  var main=document.querySelector('#main');
  var homeHTML=main.innerHTML;
  function go(name){
    if(name==='home'){main.innerHTML=homeHTML;}
    else{var el=document.querySelector('[data-page="'+name+'"]');main.innerHTML=el?el.innerHTML:homeHTML;}
    window.scrollTo({top:0});
    document.querySelectorAll('#main [data-art]').forEach(function(n){
      var svg=(window.FS_ART||{})[n.getAttribute('data-art')]; if(svg&&!n.dataset.done){n.innerHTML=svg;n.dataset.done='1';}
    });
    document.querySelectorAll('#main .reveal').forEach(function(n){n.classList.add('in');});
    if(window.FH_init) window.FH_init();
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-goto]');
    if(a){e.preventDefault();go(a.getAttribute('data-goto'));}
    var pd=e.target.closest('.pdetail, .pcard a[href^="product"]');
  });
  // بطاقات المنتج تفتح تفاصيله
  document.addEventListener('click',function(e){
    var card=e.target.closest('.pcard');
    if(card && !e.target.closest('button') && !e.target.closest('a')){
      var id=card.getAttribute('data-id');
      var pg=document.querySelector('[data-page="products"]');
      // ابحث عن صفحة المنتج ضمن البيانات المصدّرة
      if(window.FH_productPages && window.FH_productPages[id]){
        main.innerHTML=window.FH_productPages[id];
        window.scrollTo({top:0});
        main.querySelectorAll('[data-art]').forEach(function(n){var s=(window.FS_ART||{})[n.getAttribute('data-art')];if(s&&!n.dataset.done){n.innerHTML=s;n.dataset.done='1';}});
        main.querySelectorAll('.reveal').forEach(function(n){n.classList.add('in');});
        if(window.FH_init) window.FH_init();
      }
    }
  });
})();
</script>`;
    // صفحات المنتجات التفصيلية
    const prodPages = {};
    d.products.forEach(p => {
      let sub = R.pages.product(d, p);
      sub = sub.replace(/<link rel="stylesheet" href="\/assets\/css\/style\.css[^"]*">/, '');
      sub = sub.replace(/<script src="\/assets\/js\/(art|app)\.js[^"]*" defer><\/script>/g, '');
      const m1 = sub.indexOf('<main id="main">');
      const m2 = sub.indexOf('</main>', m1);
      prodPages[p.id] = embed(sub.slice(m1 + 15, m2)).replace(/href="\/(products|services|packages|tools|about|contact)(\?[^"]*)?"/g, 'href="#" data-goto="$1"').replace(/href="\/"/g, 'href="#" data-goto="home"');
    });
    html = html.replace('</body>', () => '<script>window.FH_productPages=' + JSON.stringify(prodPages).replace(/<\//g, '<\\/') + ';</script>' + navScript + '</body>');

    res.type('html').set('Content-Disposition', 'attachment; filename="furat-alhalw-website.html"').send(html);
  } catch (e) {
    res.status(500).type('text/plain; charset=utf-8').send('Export error: ' + (e && e.message));
  }
});

/* ---------- 404 ---------- */
app.use((req, res) => res.status(404).send(absMeta(R.pages.notFound(R.D()), req)));

app.listen(PORT, HOST, () => {
  GHSYNC.syncOnBoot(() => { try { buildArt(); } catch (e) {} });
  console.log(`\n  🌊  الفرات الحلو لتحلية المياه`);
  console.log(`  ➜  الموقع:      http://localhost:${PORT}`);
  console.log(`  ➜  لوحة التحكم: http://localhost:${PORT}/admin  (الرمز: ${isDefaultPin() ? DEFAULT_PIN : 'مغيَّر من اللوحة'})\n`);
});
