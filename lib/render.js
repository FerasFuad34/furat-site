'use strict';
/* ===== الفرات الحلوة لتحلية المياه — نظام العرض ===== */
const fs = require('fs');
const path = require('path');
const { productArt } = require('./art');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const readData = () => JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const D = () => readData();

const esc = (s = '') => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (n === 0 || !n ? '' : Number(n).toLocaleString('en-US'));
const tel = p => String(p || '').replace(/[^\d+]/g, '');

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_AR = { sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت' };

function toMin(t) { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return h * 60 + m; }

/* توقيت الرياض الحقيقي (UTC+3 بدون صيفي) — الخادم قد يكون بأي منطقة زمنية */
const riyadhNow = () => {
  const n = new Date(Date.now() + 3 * 3600 * 1000);
  return { getDay: () => n.getUTCDay(), getHours: () => n.getUTCHours(), getMinutes: () => n.getUTCMinutes() };
};
function openState(settings, now = riyadhNow()) {
  const hours = settings.hours || {};
  const key = DAY_KEYS[now.getDay()];
  const today = hours[key] || {};
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const fmt = t => {
    const [h, m] = String(t).split(':').map(Number);
    const h24 = h % 24;
    const per = h24 >= 12 ? 'م' : 'ص';
    const hh = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${hh}:${String(m).padStart(2, '0')} ${per}`;
  };
  if (today.closed) return { open: false, label: 'مغلق اليوم', detail: `نفتح غداً ${hours[DAY_KEYS[(now.getDay() + 1) % 7]]?.open ? fmt(hours[DAY_KEYS[(now.getDay() + 1) % 7]].open) : '—'}` };
  const o = toMin(today.open), c = toMin(today.close);
  const br = settings.fridayBreak && key === 'friday' ? settings.fridayBreak : null;
  if (o == null || c == null) return { open: true, label: 'اتصل للتأكد', detail: '' };
  if (nowMin < o) return { open: false, label: 'مغلق الآن', detail: `نفتح ${fmt(today.open)}` };
  if (nowMin > c) return { open: false, label: 'مغلق الآن', detail: `نفتح غداً ${fmt(today.open)}` };
  if (br) {
    const b1 = toMin(br.from), b2 = toMin(br.to);
    if (nowMin >= b1 && nowMin < b2) return { open: false, label: 'استراحة', detail: `نعود ${fmt(br.to)}` };
  }
  const left = c - nowMin;
  return { open: true, label: 'مفتوح الآن', detail: left <= 60 ? `يغلق بعد ${left} دقيقة` : `حتى ${fmt(today.close)}` };
}

function waLink(settings, text) {
  const num = String(settings.whatsapp || '').replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(text || `السلام عليكم، عندي استفسار عن ${settings.nameFull}`)}`;
}

/* ---------- أيقونات ---------- */
const ICONS = {
  home: '<path d="M3 11.2 12 4l9 7.2"/><path d="M5.5 10v9.5h13V10"/>',
  cafe: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M7 3c0 1.5-1 1.5-1 3M11 3c0 1.5-1 1.5-1 3"/>',
  cooler: '<rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M6 9h12"/><circle cx="10" cy="13" r="1"/><circle cx="14" cy="13" r="1"/><path d="M9 17h6"/>',
  part: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
  central: '<rect x="3" y="8" width="7" height="13" rx="3.5"/><rect x="14" y="4" width="7" height="17" rx="3.5"/><path d="M3 14h18"/>',
  install: '<path d="M14.5 6.5a3.5 3.5 0 0 1 4.6 4.6L9 21.2 4 22l.8-5z"/><path d="M4 4l4 4"/>',
  wrench: '<path d="M15.5 3.5a5.5 5.5 0 0 0-5 8.3L3.8 18.5a2 2 0 1 0 2.8 2.8l6.7-6.7a5.5 5.5 0 0 0 6.9-7.3l-3 3-2.6-2.6z"/>',
  lab: '<path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-10V3"/><path d="M7.5 14h9"/>',
  tank: '<path d="M4 7c4-2 12-2 16 0v9c0 2.5-3.6 4-8 4s-8-1.5-8-4z"/><path d="M4 7c4 2 12 2 16 0"/>',
  move: '<path d="M3 9h11v9H3z"/><path d="M14 12h4l3 3v3h-7"/><circle cx="7" cy="19" r="1.8"/><circle cx="17.5" cy="19" r="1.8"/><path d="M6 9V5h5v4"/>',
  drop: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  phone: '<path d="M6.5 3h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/>',
  wa: '<path d="M20 11.7A8 8 0 0 1 8.3 20L4 21l1-4.2A8 8 0 1 1 20 11.7z"/><path d="M9 8.6c.4-.1.8 0 1 .4l.7 1.3c.1.3.1.6-.1.8l-.4.5c-.1.2-.2.4-.1.6.4.9 1.2 1.7 2.1 2.1.2.1.4 0 .6-.1l.5-.4c.2-.2.5-.2.8-.1l1.3.7c.4.2.5.6.4 1-.3.9-1.2 1.5-2.1 1.4-2.9-.3-5.3-2.7-5.6-5.6-.1-.9.5-1.8 1.4-2.1z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2.5 3h2.6l2.6 12.2h11L21 7H6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4.5-5.5"/><circle cx="12" cy="18" r="1.4"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20a6.4 6.4 0 0 0-2.4-5"/>',
  truck: '<rect x="2" y="7" width="11" height="9" rx="1.5"/><path d="M13 10h4l3 3v3h-7"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  medal: '<circle cx="12" cy="14" r="6"/><path d="m8.5 8.5-2-5.5h9l-2 5.5"/><path d="m12 11.5.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3.5 12.5 8.5 4.7 8.5-4.7"/><path d="m3.5 16.8 8.5 4.7 8.5-4.7"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.drop}</svg>`;

/* ---------- صورة المنتج ---------- */
function productImage(p) {
  const src = p.image || (Array.isArray(p.images) && p.images[0]) || '';
  if (src) return `<img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy" class="pimg">`;
  return `<div class="part" data-art="${esc(p.id)}" aria-label="${esc(p.name)}"></div>`;
}

/* ---------- معرض صور المنتج (صورة رئيسية + أسهم + مصغرات + سحب) ---------- */
function productGallery(p) {
  const imgs = [];
  const add = u => { if (u && !imgs.includes(u)) imgs.push(u); };
  add(p.image);
  (Array.isArray(p.images) ? p.images : []).forEach(add);
  if (!imgs.length) {
    // لا صور بعد — رسم توضيحي تلقائي حتى يضيف المالك الصور الحقيقية
    return `<div class="gal"><div class="gal-stage"><div class="gal-slide is-on"><div class="part" data-art="${esc(p.id)}" aria-label="${esc(p.name)}"></div></div></div></div>`;
  }
  const chev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const multi = imgs.length > 1;
  return `<div class="gal" data-gal>
    <div class="gal-stage">
      ${imgs.map((u, i) => `<div class="gal-slide${i === 0 ? ' is-on' : ''}"><img src="${esc(u)}" alt="${esc(p.name)} — صورة ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}"></div>`).join('')}
      ${multi ? `<button class="gal-arrow gal-prev" type="button" aria-label="الصورة السابقة">${chev}</button>
      <button class="gal-arrow gal-next" type="button" aria-label="الصورة التالية">${chev}</button>
      <div class="gal-count"><b>1</b> / ${imgs.length}</div>` : ''}
    </div>
    ${multi ? `<div class="gal-thumbs">${imgs.map((u, i) => `<button class="gal-thumb${i === 0 ? ' is-active' : ''}" type="button" aria-label="عرض الصورة ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
  </div>`;
}
const artMap = data => Object.fromEntries(data.products.map(p => [p.id, productArt(p, p.id)]));

/* ---------- القالب العام ---------- */
function layout({ title, desc, body, active = '', data, art, extraHead = '', jsonLd = '', canonical = '', needArt = true }) {
  const s = data.settings;
  const fsObj = JSON.stringify({ products: needArt ? data.products : [], categories: data.categories, settings: s }).replace(/<\//g, '<\\/');
  const artTag = `<script>window.FS = ${fsObj};</script>` + (needArt ? '<script src="/assets/js/art.js?v=13" defer></script>' : '');
  const st = openState(s);
  const year = new Date().getFullYear();
  const nav = [['/', 'الرئيسية', 'home'], ['/products', 'المنتجات', 'products'], ['/services', 'الخدمات', 'services'], ['/about', 'من نحن', 'about'], ['/contact', 'تواصل معنا', 'contact']];

  const jsonLdFull = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: s.nameFull,
    description: desc,
    telephone: s.phoneDisplay,
    address: { '@type': 'PostalAddress', addressLocality: 'الرياض', addressCountry: 'SA', streetAddress: s.address },
    openingHoursSpecification: DAY_KEYS.filter(k => s.hours[k] && !s.hours[k].closed).map(k => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' }[k],
      opens: s.hours[k].open, closes: s.hours[k].close
    })),
    aggregateRating: s.rating ? { '@type': 'AggregateRating', ratingValue: s.rating, reviewCount: s.reviewsCount } : undefined
  };

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#073B57">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/logo/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css?v=13">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="/assets/logo/logo-full-1200.png">
<meta property="og:locale" content="ar_SA">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/undefined/g, 'null')}${jsonLd ? '\n' + jsonLd : ''}</script>
${extraHead}
</head>
<body class="${active}">
<a class="skip" href="#main">انتقل للمحتوى</a>

<header class="hdr" id="hdr">
  <div class="hdr-top">
    <div class="wrap hdr-top-in">
      <div class="hdr-pills">
        <span class="pill ${st.open ? 'pill--on' : 'pill--off'}"><i class="dot"></i>${esc(st.label)}<b>${esc(st.detail)}</b></span>
        <span class="pill pill--ghost hide-sm">تركيب مجاني داخل الرياض</span>
        <span class="pill pill--ghost hide-sm">ضمان سنتان</span>
      </div>
      <div class="hdr-top-links">
        <a href="tel:${tel(s.phone)}" class="tlink">${icon('phone')}<span>${esc(s.phoneDisplay)}</span></a>
        <span class="vsep"></span>
        <button class="theme-btn" id="themeBtn" aria-label="تبديل الوضع الليلي">${icon('moon')}</button>
      </div>
    </div>
  </div>
  <div class="hdr-main">
    <div class="wrap hdr-main-in">
      <a class="brand" href="/">
        ${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="" class="brand-mark" width="46" height="46">` : `<img src="/assets/logo/logo-symbol.svg" alt="" class="brand-mark" width="46" height="46">`}
        <span class="brand-txt"><b>${esc(s.name)}</b><i>لتحلية المياه</i></span>
      </a>
      <nav class="nav" id="nav">
        ${nav.map(([href, label, key]) => `<a href="${href}" class="${key === active ? 'is-active' : ''}">${esc(label)}</a>`).join('')}
      </nav>
      <div class="hdr-cta">
        <button class="cart-btn" id="cartBtn" aria-label="سلة الطلب">${icon('cart')}<span class="cart-count" id="cartCount">0</span></button>
        <a class="btn btn--wa btn--sm" href="${waLink(s)}" target="_blank" rel="noopener">${icon('wa')} اطلب واتساب</a>
        <button class="burger" id="burger" aria-label="القائمة" aria-expanded="false">${icon('menu')}</button>
      </div>
    </div>
  </div>
  <div class="nav-progress"><i id="navProgress"></i></div>
</header>

<main id="main">
${body}
</main>

<footer class="ftr">
  <div class="ftr-wave" aria-hidden="true">
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 60 Q180 20 360 55 T720 55 T1080 55 T1440 55 V120 H0 Z" fill="currentColor"/></svg>
  </div>
  <div class="wrap ftr-grid">
    <div class="ftr-col ftr-brand">
      ${s.logoFullUrl ? `<img src="${esc(s.logoFullUrl)}" alt="${esc(s.nameFull)}" width="230" style="max-height:72px;width:auto;object-fit:contain">` : `<img src="/assets/logo/logo-full-white.svg" alt="${esc(s.nameFull)}" width="230">`}
      <p>${esc(s.tagline)} — ${esc(s.coverage)}.</p>
      <div class="ftr-social">
        ${s.social.instagram ? `<a href="${esc(s.social.instagram)}" target="_blank" rel="noopener" aria-label="انستقرام">IG</a>` : ''}
        ${s.social.snapchat ? `<a href="${esc(s.social.snapchat)}" target="_blank" rel="noopener" aria-label="سناب شات">SC</a>` : ''}
        ${s.social.tiktok ? `<a href="${esc(s.social.tiktok)}" target="_blank" rel="noopener" aria-label="تيك توك">TT</a>` : ''}
        ${s.social.twitter ? `<a href="${esc(s.social.twitter)}" target="_blank" rel="noopener" aria-label="إكس">X</a>` : ''}
      </div>
    </div>
    <div class="ftr-col">
      <h4>روابط سريعة</h4>
      <ul>${nav.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ul>
    </div>
    <div class="ftr-col">
      <h4>أقسام المنتجات</h4>
      <ul>${data.categories.slice(0, 6).map(c => `<li><a href="/products?cat=${esc(c.id)}">${esc(c.name)}</a></li>`).join('')}</ul>
    </div>
    <div class="ftr-col">
      <h4>أوقات العمل</h4>
      <ul class="hours">
        ${DAY_KEYS.slice().reverse().map(k => {
          const h = s.hours[k] || {};
          return `<li class="${k === DAY_KEYS[riyadhNow().getDay()] ? 'is-today' : ''}"><span>${DAY_AR[k]}</span><b>${h.closed ? 'مغلق' : `${fmtShort(h.open)} – ${fmtShort(h.close)}`}</b></li>`;
        }).join('')}
      </ul>
    </div>
    <div class="ftr-col">
      <h4>تواصل معنا</h4>
      <ul class="contact-list">
        <li><a href="tel:${tel(s.phone)}">${icon('phone')} ${esc(s.phoneDisplay)}</a></li>
        <li><a href="${waLink(s)}" target="_blank" rel="noopener">${icon('wa')} واتساب للطلبات</a></li>
        ${s.email ? `<li><a href="mailto:${esc(s.email)}">${icon('mail')} ${esc(s.email)}</a></li>` : ''}
        <li><a href="${esc(s.maps)}" target="_blank" rel="noopener">${icon('pin')} ${esc(s.address)}</a></li>
      </ul>
    </div>
  </div>
  <div class="ftr-bottom">
    <div class="wrap ftr-bottom-in">
      <p>© ${year} ${esc(s.nameFull)} — جميع الحقوق محفوظة.</p>
      <p class="ftr-legal">
        ${s.crNumber && s.crNumber !== '—' ? `س.ت: ${esc(s.crNumber)}` : ''}
        ${s.unifiedNumber ? ` · الرقم الموحد: ${esc(s.unifiedNumber)}` : ''}
        ${s.vatNumber ? ` · الرقم الضريبي: ${esc(s.vatNumber)}` : ''}
        ${s.taxNote ? ` · ${esc(s.taxNote)}` : ''}
      </p>
    </div>
  </div>
</footer>


<!-- أزرار عائمة -->
<div class="fab-stack">
  <a class="fab fab--wa" href="${waLink(s)}" target="_blank" rel="noopener" aria-label="واتساب">${icon('wa')}<span class="fab-pulse"></span></a>
  <a class="fab fab--tel" href="tel:${tel(s.phone)}" aria-label="اتصال">${icon('phone')}</a>
  <a class="fab fab--map" href="${esc(s.maps)}" target="_blank" rel="noopener" aria-label="الموقع">${icon('pin')}</a>
  <button class="fab fab--top" id="toTop" aria-label="أعلى الصفحة">${icon('chev')}</button>
</div>

<!-- سلة الطلب -->
<aside class="drawer" id="cartDrawer" aria-hidden="true">
  <div class="drawer-head">
    <h3>سلة الطلب</h3>
    <button class="drawer-x" id="cartClose" aria-label="إغلاق">${icon('x')}</button>
  </div>
  <div class="drawer-body" id="cartBody"></div>
  <div class="drawer-foot">
    <div class="cart-total"><span>الإجمالي</span><b id="cartTotal">0</b></div>
    <button class="btn btn--wa btn--block" id="cartSend">${icon('wa')} أرسل الطلب عبر واتساب</button>
    <p class="drawer-note">طلبك يوصلنا رسالة جاهزة — نتصل عليك نأكد ونحدد الموعد.</p>
  </div>
</aside>
<div class="scrim" id="scrim"></div>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

${artTag}
<script src="/assets/js/app.js?v=13" defer></script>
</body>
</html>`;
}

function fmtShort(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  const h24 = h % 24;
  const per = h24 >= 12 ? 'م' : 'ص';
  const hh = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${hh}:${String(m).padStart(2, '0')}${per}`;
}

/* ---------- مكوّنات ---------- */
const sectionHead = (eyebrow, title, sub) => `
<div class="sec-head reveal">
  ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}
  <h2>${title}</h2>
  ${sub ? `<p>${esc(sub)}</p>` : ''}
</div>`;

const wave = (cls = '') => `<div class="wave ${cls}" aria-hidden="true"><svg viewBox="0 0 1440 90" preserveAspectRatio="none"><path d="M0 40 Q240 0 480 35 T960 35 T1440 30 V90 H0Z"/></svg></div>`;

function productCard(p, cat, hasArt = true) {
  const s = D().settings;
  const art = hasArt;
  const off = p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return `<article class="card pcard reveal" data-cat="${esc(p.category)}" data-id="${esc(p.id)}">
    <a class="pcard-media pcard-link" href="/product/${esc(p.id)}" aria-label="${esc(p.name)} — عرض الصور والتفاصيل">
      ${productImage(p)}
      ${p.badge ? `<span class="flag">${esc(p.badge)}</span>` : ''}
      ${off ? `<span class="off">وفّر ${off}%</span>` : ''}
      ${p.stock && p.stock !== 'متوفر' ? `<span class="stock">${esc(p.stock)}</span>` : ''}
      <span class="pcard-zoom" aria-hidden="true">🔍</span>
    </a>
    <div class="pcard-body">
      <span class="pcard-cat">${icon(cat.icon)} ${esc(cat.short)}</span>
      <h3><a class="pcard-title" href="/product/${esc(p.id)}">${esc(p.name)}</a></h3>
      <p class="pcard-desc">${esc(p.desc)}</p>
      <ul class="specs">
        ${p.stages ? `<li>${p.stages} مراحل</li>` : ''}
        ${p.output && p.output !== '—' ? `<li>${esc(p.output)}</li>` : ''}
        ${p.warranty && p.warranty !== '—' ? `<li>ضمان ${esc(p.warranty)}</li>` : ''}
        ${p.installIncluded ? `<li>تركيب مجاني</li>` : ''}
      </ul>
      <div class="pcard-foot">
        <div class="price">
          ${p.oldPrice && p.oldPrice > p.price ? `<s>${money(p.oldPrice)}</s>` : ''}
          <b>${money(p.price)}</b><span>ريال</span>
        </div>
        <div class="pcard-acts">
          ${art ? '<button class="btn btn--ghost btn--xs" data-add="' + esc(p.id) + '">' + icon('cart') + ' أضف</button>' : ''}
          <a class="btn btn--wa btn--xs" target="_blank" rel="noopener" href="${waLink(s, `السلام عليكم، أبغى أستفسر عن: ${p.name} (${money(p.price)} ريال) — ${s.nameFull}`)}">${icon('wa')} اطلب</a>
        </div>
      </div>
    </div>
  </article>`;
}

/* ---------- الصفحات ---------- */
function pageHome(data) {
  const s = data.settings;
  const art = artMap(data);
  const featured = data.products.filter(p => p.badge).slice(0, 3).concat(data.products.filter(p => !p.badge)).slice(0, 6);

  const body = `
<!-- ===== البطل ===== -->
<section class="hero">
  <div class="hero-bg" aria-hidden="true">
    <div class="hero-glow"></div>
    <div class="hero-grid"></div>
  </div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <span class="eyebrow eyebrow--light reveal">${esc(s.coverage)} · استجابة خلال ${esc(s.responseTime)} ساعة</span>
      <h1 class="reveal">ماءٌ <em>عذب</em>…<br>في كل بيت</h1>
      <p class="lead reveal">${esc(s.heroText)}</p>
      <div class="hero-cta reveal">
        <a class="btn btn--gold btn--lg" href="${waLink(s)}" target="_blank" rel="noopener">${icon('wa')} اطلب عبر واتساب</a>
        <a class="btn btn--glass btn--lg" href="/products">تصفّح المنتجات</a>
      </div>
      <ul class="hero-badges reveal">
        <li>${icon('check')} ${s.freeCheckup ? 'فحص مياه مجاني' : 'فحص مياه'}</li>
        <li>${icon('check')} ${s.freeInstall ? 'تركيب مجاني' : 'تركيب'}</li>
        <li>${icon('check')} ضمان سنتان</li>
        <li>${icon('check')} تذكير صيانة تلقائي</li>
      </ul>
    </div>
    <div class="hero-art reveal">
      <div class="hero-card">
        <div class="hero-card-top">
          <span class="live"><i></i>نخدمكم يومياً</span>
          <b>${(() => { const h = (s.hours && s.hours[DAY_KEYS[riyadhNow().getDay()]]) || {}; return h.closed ? 'مغلق اليوم' : `${fmtShort(h.open || '09:00')} — ${fmtShort(h.close || '24:00')}`; })()}</b>
        </div>
        <ul class="hero-card-list">
          <li>توصيل وتركيب مجاني داخل الرياض</li>
          <li>نقيس ملوحة مويتك مجاناً قبل ما تشتري</li>
          <li>صيانة وقطع غيار للأجهزة المنزلية والتجارية</li>
        </ul>
        <p class="hero-card-note">${esc(s.phoneDisplay)} — واتساب واتصال</p>
      </div>
    </div>
  </div>
  ${wave('hero-wave')}
</section>

<!-- ===== الأقسام ===== -->
<section class="sec">
  <div class="wrap">
    ${sectionHead('أقسامنا', 'كل ما يخص الماء تحت سقف واحد', 'من جهاز تحت المجلى إلى محطة مركزية لفيلا أو مطعم — اختر القسم وتصفّح')}
    <div class="cats">
      ${data.categories.map(c => {
        const count = data.products.filter(p => p.category === c.id).length;
        return `<a class="cat reveal" href="/products?cat=${esc(c.id)}">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.desc)}</p>
          <span class="cat-more">${count} صنف</span>
        </a>`;
      }).join('')}
    </div>
  </div>
</section>

<!-- ===== المنتجات المميزة ===== -->
<section class="sec sec--alt">
  <div class="wrap">
    ${sectionHead('الأكثر طلباً', 'منتجات مختارة من معرضنا', 'الأسعار نهائية وتشمل التركيب داخل الرياض')}
    <div class="grid grid--3">
      ${featured.map(p => productCard(p, data.categories.find(c => c.id === p.category) || data.categories[0])).join('')}
    </div>
    <div class="center reveal"><a class="btn btn--ink btn--lg" href="/products">شوف كل المنتجات</a></div>
  </div>
</section>

<!-- ===== الخدمات ===== -->
<section class="sec">
  <div class="wrap">
    ${sectionHead('خدماتنا', 'بيع… وتركيب… ومتابعة ما تنقطع', 'ما ننتهي عند البيع — نبقى معك طول عمر الجهاز')}
    <div class="grid grid--3">
      ${data.services.map(sv => `<article class="scard reveal">
        <h3>${esc(sv.title)}</h3>
        <p>${esc(sv.desc)}</p>
        <ul>${sv.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      </article>`).join('')}
    </div>
    <div class="center reveal"><a class="btn btn--ink" href="/services">تفاصيل الخدمات</a></div>
  </div>
</section>

<!-- ===== شريط CTA ===== -->
<section class="cta">
  <div class="wrap cta-in reveal">
    <div>
      <h2>محتار أي جهاز يناسب موية بيتك؟</h2>
      <p>أرسل لنا موقعك على واتساب ويوصلك فني يقيس الملوحة <b>مجاناً</b> — بدون أي التزام إنك تشتري.</p>
    </div>
    <div class="cta-btns">
      <a class="btn btn--gold btn--lg" href="${waLink(s, 'السلام عليكم، أبغى فحص مويه مجاني عشان أعرف الجهاز المناسب — ' + s.nameFull)}" target="_blank" rel="noopener">${icon('wa')} احجز فحص مجاني</a>
      <a class="btn btn--glass btn--lg" href="tel:${tel(s.phone)}">${icon('phone')} ${esc(s.phoneDisplay)}</a>
    </div>
  </div>
</section>

<!-- ===== الأسئلة الشائعة ===== -->
<section class="sec sec--alt">
  <div class="wrap wrap--narrow">
    ${sectionHead('أسئلة متكررة', 'إجابات سريعة قبل ما تتصل', '')}
    <div class="faq">
      ${data.faqs.map((f, i) => `<details class="faq-i reveal" ${i === 0 ? 'open' : ''}>
        <summary>${esc(f.q)}<span class="faq-ic">${icon('chev')}</span></summary>
        <div class="faq-a"><p>${esc(f.a)}</p></div>
      </details>`).join('')}
    </div>
  </div>
</section>`;

  return layout({ title: `${s.nameFull} | ${s.tagline}`, desc: s.heroText.slice(0, 155), body, active: 'home', data, art });
}

function pageProducts(data, query = {}) {
  const s = data.settings;
  const art = artMap(data);
  const cat = query.cat || 'all';
  const body = `
<section class="phero">
  <div class="wrap">
    <nav class="crumbs"><a href="/">الرئيسية</a>${icon('chev')}<span>المنتجات</span></nav>
    <h1>منتجاتنا</h1>
    <p>كل الأسعار نهائية وتشمل التركيب داخل الرياض، إلا إذا انذكر غير كذا.</p>
  </div>
  ${wave()}
</section>
<section class="sec sec--tight">
  <div class="wrap">
    <div class="filter-bar">
      <div class="filters" id="filters">
        <button class="fchip ${cat === 'all' ? 'is-on' : ''}" data-f="all">الكل <b>${data.products.length}</b></button>
        ${data.categories.map(c => `<button class="fchip ${cat === c.id ? 'is-on' : ''}" data-f="${esc(c.id)}">${icon(c.icon)} ${esc(c.short)} <b>${data.products.filter(p => p.category === c.id).length}</b></button>`).join('')}
      </div>
      <div class="sortwrap">
        <label>ترتيب:
          <select id="sortSel">
            <option value="featured">المميزة أولاً</option>
            <option value="price-asc">السعر: من الأقل</option>
            <option value="price-desc">السعر: من الأعلى</option>
            <option value="name">الاسم</option>
          </select>
        </label>
      </div>
    </div>
    <div class="grid grid--3" id="pgrid">
      ${data.products.map(p => productCard(p, data.categories.find(c => c.id === p.category) || data.categories[0])).join('')}
    </div>
    <p class="empty" id="pempty" hidden>ما فيه منتجات بهالقسم الحين.</p>
  </div>
</section>
<section class="cta"><div class="wrap cta-in">
  <div><h2>ما لقيت اللي تدور عليه؟</h2><p>عندنا أصناف ثانية بالمعرض — أرسل لنا صورة أو مواصفات الجهاز ونوفّره لك.</p></div>
  <div class="cta-btns"><a class="btn btn--gold btn--lg" href="${waLink(s, 'السلام عليكم، أدور على جهاز بمواصفات معينة — ' + s.nameFull)}" target="_blank" rel="noopener">${icon('wa')} أرسل المواصفات</a></div>
</div></section>`;
  return layout({ title: `المنتجات | ${s.nameFull}`, desc: 'أجهزة تحلية مياه منزلية، محطات مقاهي ومطاعم، برادات، وقطع غيار أصلية في الرياض مع تركيب مجاني وضمان سنتين.', body, active: 'products', data, art });
}

function pageProduct(data, p) {
  const s = data.settings;
  const art = artMap(data);
  const cat = data.categories.find(c => c.id === p.category) || data.categories[0];
  const related = data.products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 3);
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.desc, offers: { '@type': 'Offer', price: p.price, priceCurrency: 'SAR', availability: p.stock === 'متوفر' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder' } });
  const body = `
<section class="phero phero--soft">
  <div class="wrap">
    <nav class="crumbs"><a href="/">الرئيسية</a>${icon('chev')}<a href="/products">المنتجات</a>${icon('chev')}<a href="/products?cat=${esc(cat.id)}">${esc(cat.name)}</a>${icon('chev')}<span>${esc(p.name)}</span></nav>
  </div>
</section>
<section class="sec sec--tight">
  <div class="wrap pdetail">
    <div class="pd-media reveal">
      ${productGallery(p)}
      ${p.badge ? `<span class="flag">${esc(p.badge)}</span>` : ''}
    </div>
    <div class="pd-info">
      <span class="pcard-cat">${icon(cat.icon)} ${esc(cat.name)}</span>
      <h1>${esc(p.name)}</h1>
      <p class="pd-desc">${esc(p.desc)}</p>
      <div class="pd-price">
        ${p.oldPrice && p.oldPrice > p.price ? `<s>${money(p.oldPrice)} ريال</s>` : ''}
        <b>${money(p.price)}</b><span>ريال</span>
        ${s.taxNote ? `<i>${esc(s.taxNote)}</i>` : ''}
      </div>
      <div class="pd-specs">
        ${p.stages ? `<div><span>عدد المراحل</span><b>${p.stages}</b></div>` : ''}
        ${p.output && p.output !== '—' ? `<div><span>الإنتاجية</span><b>${esc(p.output)}</b></div>` : ''}
        ${p.origin ? `<div><span>المنشأ</span><b>${esc(p.origin)}</b></div>` : ''}
        ${p.warranty && p.warranty !== '—' ? `<div><span>الضمان</span><b>${esc(p.warranty)}</b></div>` : ''}
        <div><span>التركيب</span><b>${p.installIncluded ? 'مجاني' : 'غير مشمول'}</b></div>
        <div><span>التوفر</span><b>${esc(p.stock || 'متوفر')}</b></div>
      </div>
      <ul class="pd-feats">${(p.features || []).map(f => `<li>${icon('check')} ${esc(f)}</li>`).join('')}</ul>
      <div class="pd-acts">
        <button class="btn btn--gold btn--lg" data-add="${esc(p.id)}">${icon('cart')} أضف لسلة الطلب</button>
        <a class="btn btn--wa btn--lg" target="_blank" rel="noopener" href="${waLink(s, `السلام عليكم، أبغى أطلب: ${p.name} (${money(p.price)} ريال) — ${s.nameFull}`)}">${icon('wa')} اطلب عبر واتساب</a>
        <a class="btn btn--ghost btn--lg" href="tel:${tel(s.phone)}">${icon('phone')} اتصل</a>
      </div>
      <div class="pd-trust">
        <span>توصيل وتركيب</span><span>ضمان ${esc(p.warranty || '—')}</span><span>فحص أملاح مجاني</span>
      </div>
    </div>
  </div>
</section>
${related.length ? `<section class="sec sec--alt"><div class="wrap">
  ${sectionHead('يمكن يعجبك بعد', 'أصناف تشبهه من نفس القسم', '')}
  <div class="grid grid--3">${related.map(r => productCard(r, cat)).join('')}</div>
</div></section>` : ''}`;
  return layout({ title: `${p.name} | ${s.nameFull}`, desc: p.desc.slice(0, 155), body, active: 'products', data, art, jsonLd });
}

function pageServices(data) {
  const s = data.settings;
  const art = artMap(data);
  const body = `
<section class="phero"><div class="wrap">
  <nav class="crumbs"><a href="/">الرئيسية</a>${icon('chev')}<span>الخدمات</span></nav>
  <h1>خدماتنا</h1>
  <p>بيع وتركيب وصيانة أجهزة تحلية المياه المنزلية والبرادات، ومحطات التحلية للمقاهي والمطاعم.</p>
</div>${wave()}</section>
<section class="sec sec--tight"><div class="wrap">
  <div class="srv-list">
    ${data.services.map((sv, i) => `<article class="srv reveal ${i % 2 ? 'srv--rev' : ''}">
      <div class="srv-ic">${icon(sv.icon)}</div>
      <div class="srv-body">
        <h2>${esc(sv.title)}</h2>
        <p>${esc(sv.desc)}</p>
        <ul>${sv.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
        <a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="${waLink(s, `السلام عليكم، أبغى خدمة: ${sv.title} — ${s.nameFull}`)}">${icon('wa')} اطلب الخدمة</a>
      </div>
    </article>`).join('')}
  </div>
</div></section>
<section class="cta"><div class="wrap cta-in">
  <div><h2>خدمة ما لقيتها بالقائمة؟</h2><p>قل لنا وش تحتاج ونعطيك عرض سعر واضح.</p></div>
  <div class="cta-btns"><a class="btn btn--gold btn--lg" href="${waLink(s)}" target="_blank" rel="noopener">${icon('wa')} اطلب عرض سعر</a></div>
</div></section>`;
  return layout({ title: `الخدمات | ${s.nameFull}`, desc: 'تركيب وصيانة أجهزة تحلية المياه، فحص المياه وقياس الأملاح، تجهيز المقاهي والمطاعم، تنقية الخزانات، وفك ونقل الأجهزة في الرياض.', body, active: 'services', data, art });
}

function pageAbout(data) {
  const s = data.settings;
  const body = `
<section class="phero"><div class="wrap">
  <nav class="crumbs"><a href="/">الرئيسية</a>${icon('chev')}<span>من نحن</span></nav>
  <h1>${esc(s.nameFull)}</h1>
  <p>${esc(s.tagline)}</p>
</div>${wave()}</section>
<section class="sec sec--tight"><div class="wrap wrap--narrow">
  <div class="prose reveal">
    <p class="big">إحنا محل متخصصين في <b>بيع وتركيب وصيانة أجهزة تحلية المياه المنزلية والبرادات</b>، ومحطات التحلية الخاصة بالمقاهي والمطاعم.</p>
    <p>بدأنا من محل واحد وهدف واحد: إن العميل يشتري الجهاز المناسب لموية بيته — مو الأغلى ولا الأرخص. عشان كذا أول خطوة عندنا دايم هي <b>قياس ملوحة المويه</b>، وبعدها نرشّح.</p>
    <p>نخدم ${esc(s.coverage)} بفريق مجهز بسيارات خدمة وعدة قياس كاملة — ولعملاء المنشآت عقود صيانة دورية تحفظ لهم استمرارية الإنتاج طول السنة.</p>
    ${s.officialName ? `<div class="est-card">
      <h3>بطاقة المنشأة</h3>
      <ul>
        <li><span>الاسم الرسمي</span><b>${esc(s.officialName)}</b></li>
        ${s.ownerName ? `<li><span>الإدارة</span><b>${esc(s.ownerName)}</b></li>` : ''}
        ${s.crNumber && s.crNumber !== '—' ? `<li><span>السجل التجاري</span><b>${esc(s.crNumber)}</b></li>` : ''}
        ${s.unifiedNumber ? `<li><span>الرقم الموحد</span><b>${esc(s.unifiedNumber)}</b></li>` : ''}
      </ul>
    </div>` : ''}
  </div>
  <div class="values">
    ${[['نقيس قبل ما نبيع', 'فحص أملاح مجاني لكل عميل قبل التوصية', 'lab'],
       ['موعد يعني موعد', 'نلتزم بالموعد، ونتصل عليك قبل لا نوصل', 'clock'],
       ['قطع أصلية فقط', 'ما نركّب شمعة مجهولة المصدر أبداً', 'shield'],
       ['نتابع بعد البيع', 'تذكير واتساب قبل موعد الصيانة', 'wa']].map(([t, d, ic]) =>
      `<div class="value reveal"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}
  </div>
</div></section>`;
  return layout({ title: `من نحن | ${s.nameFull}`, desc: `${s.nameFull} — محل متخصص في بيع وتركيب وصيانة أجهزة تحلية المياه المنزلية والبرادات ومحطات المقاهي والمطاعم في الرياض.`, body, active: 'about', data, needArt: false });
}

function pageContact(data) {
  const s = data.settings;
  const st = openState(s);
  const body = `
<section class="phero"><div class="wrap">
  <nav class="crumbs"><a href="/">الرئيسية</a>${icon('chev')}<span>تواصل معنا</span></nav>
  <h1>تواصل معنا</h1>
  <p class="${st.open ? 'is-open' : 'is-closed'}"><i class="dot"></i> ${esc(st.label)} ${st.detail ? '· ' + esc(st.detail) : ''}</p>
</div>${wave()}</section>
<section class="sec sec--tight"><div class="wrap contact-grid">
  <div class="cinfo reveal">
    <a class="cbox cbox--wa" href="${waLink(s)}" target="_blank" rel="noopener"><span>${icon('wa')}</span><div><b>واتساب</b><i>أسرع طريقة للطلب والاستفسار</i></div></a>
    <a class="cbox" href="tel:${tel(s.phone)}"><span>${icon('phone')}</span><div><b>${esc(s.phoneDisplay)}</b><i>اتصال مباشر</i></div></a>
    ${s.email ? `<a class="cbox" href="mailto:${esc(s.email)}"><span>${icon('mail')}</span><div><b>${esc(s.email)}</b><i>للعروض وعقود الشركات</i></div></a>` : ''}
    <a class="cbox" href="${esc(s.maps)}" target="_blank" rel="noopener"><span>${icon('pin')}</span><div><b>${esc(s.address)}</b><i>${esc(s.addressNote || '')}</i></div></a>
    <div class="cbox cbox--static"><span>${icon('clock')}</span><div><b>أوقات العمل</b>
      <ul class="hours hours--dark">
        ${DAY_KEYS.map(k => { const h = s.hours[k] || {}; return `<li class="${k === DAY_KEYS[riyadhNow().getDay()] ? 'is-today' : ''}"><span>${DAY_AR[k]}</span><b>${h.closed ? 'مغلق' : `${fmtShort(h.open)} – ${fmtShort(h.close)}`}</b></li>`; }).join('')}
      </ul>
    </div></div>
  </div>
  <form class="cform reveal" id="quoteForm">
    <h2>أرسل طلبك أو استفسارك</h2>
    <p class="muted">عبّ النموذج ونحوّله لك رسالة واتساب جاهزة.</p>
    <div class="frow">
      <label>الاسم<input name="name" required placeholder="اسمك"></label>
      <label>الجوال<input name="phone" required placeholder="05xxxxxxxx" inputmode="tel"></label>
    </div>
    <label>نوع الطلب
      <select name="type">
        <option>شراء جهاز تحلية منزلي</option>
        <option>محطة لمقهى أو مطعم</option>
        <option>برادة مياه</option>
        <option>قطع غيار / شمعات</option>
        <option>صيانة أو إصلاح</option>
        <option>باقة صيانة سنوية</option>
        <option>فحص مياه مجاني</option>
        <option>محطة مركزية / فيلا</option>
      </select>
    </label>
    <label>الحي<input name="area" placeholder="مثال: حي السويدي"></label>
    <label>التفاصيل<textarea name="msg" rows="4" placeholder="اكتب تفاصيل طلبك…"></textarea></label>
    <button class="btn btn--wa btn--lg btn--block" type="submit">${icon('wa')} أرسل عبر واتساب</button>
    <p class="form-note">بياناتك أمانة عندنا وما نشاركها مع أحد. نرد عليك بأوقات العمل.</p>
  </form>
</div></section>
<section class="sec sec--map"><div class="wrap">
  <div class="map-wrap reveal">
    <iframe title="موقعنا على الخريطة" src="${esc(s.maps.replace('https://maps.google.com/?q=', 'https://maps.google.com/maps?q=') + '&output=embed')}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
  </div>
</div></section>`;
  return layout({ title: `تواصل معنا | ${s.nameFull}`, desc: `تواصل مع ${s.nameFull} في الرياض — ${s.phoneDisplay}. ${s.address}. واتساب، اتصال، أو زيارة المعرض.`, body, active: 'contact', data, needArt: false });
}

function pageNotFound(data) {
  const s = data.settings;
  const body = `<section class="sec sec--err"><div class="wrap center">
    <div class="err-code">404</div>
    <h1>هذي الصفحة ما لها وجود</h1>
    <p>يمكن الرابط قديم — بس المويه العذبة موجودة 😉</p>
    <div class="hero-cta center"><a class="btn btn--gold btn--lg" href="/">الصفحة الرئيسية</a><a class="btn btn--ghost btn--lg" href="/products">المنتجات</a></div>
  </div></section>`;
  return layout({ title: `الصفحة غير موجودة | ${s.nameFull}`, desc: '404', body, active: '', data, needArt: false });
}

/* ---------- المدونة ---------- */
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const fmtDate = ds => { if (!ds) return ''; const [y, m, d] = ds.split('-').map(Number); return `${d} ${MONTHS_AR[m - 1]} ${y}`; };

module.exports = {
  D, readData, layout, esc, money, waLink, icon, openState, artMap,
  pages: { home: pageHome, products: pageProducts, product: pageProduct, services: pageServices, about: pageAbout, contact: pageContact, notFound: pageNotFound }
};
