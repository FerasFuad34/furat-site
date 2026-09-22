/* =========================================================
   الفرات الحلوة — سكربت الموقع
   ========================================================= */
(function () {
  'use strict';
  const FS = window.FS || { products: [], categories: [], settings: {} };
  FS.art = window.FS_ART || FS.art || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = n => Number(n || 0).toLocaleString('en-US');
  const waNum = String((FS.settings && FS.settings.whatsapp) || '').replace(/\D/g, '');

  /* ---------- 1) حقن رسوم المنتجات ---------- */
  function injectArt() {
    $$('[data-art]').forEach(el => {
      const svg = FS.art && FS.art[el.getAttribute('data-art')];
      if (svg && !el.dataset.done) { el.innerHTML = svg; el.dataset.done = '1'; }
    });
  }

  /* ---------- 2) الكشف عند التمرير ---------- */
  function initReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en, i) => {
        if (en.isIntersecting) {
          setTimeout(() => en.target.classList.add('in'), Math.min(i * 70, 280));
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ---------- 3) العدّادات ---------- */
  function initCounters() {
    const els = $$('.num[data-count]');
    if (!els.length) return;
    const run = el => {
      const target = Number(el.getAttribute('data-count')) || 0;
      const dur = 1500, t0 = performance.now();
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * e)) + (target >= 1000 && p === 1 ? '+' : '');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { run(x.target); io.unobserve(x.target); } }), { threshold: 0.5 });
    els.forEach(e => io.observe(e));
  }

  /* ---------- 4) الترويسة ---------- */
  function initHeader() {
    const hdr = $('#hdr'), prog = $('#navProgress'), top = $('#toTop');
    let raf;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (hdr) hdr.classList.toggle('is-stuck', y > 8);
        if (prog) {
          const h = document.documentElement.scrollHeight - window.innerHeight;
          prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
        }
        if (top) top.classList.toggle('show', y > 500);
        raf = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (top) top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // القائمة الجانبية
    const burger = $('#burger'), nav = $('#nav'), scrim = $('#scrim');
    const closeNav = () => { nav && nav.classList.remove('open'); burger && burger.setAttribute('aria-expanded', 'false'); closeCart(); };
    if (burger) burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      if (scrim) scrim.classList.toggle('show', open);
    });
    if (scrim) scrim.addEventListener('click', closeNav);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
    $$('a', nav).forEach(a => a.addEventListener('click', closeNav));
  }

  /* ---------- 5) الوضع الليلي ---------- */
  function initTheme() {
    const btn = $('#themeBtn');
    const saved = localStorage.getItem('fh-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const set = t => {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('fh-theme', t);
      if (btn) btn.innerHTML = t === 'dark'
        ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 15.5 4.9 17"/></svg>'
        : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';
    };
    set(saved || (prefersDark ? 'dark' : 'light'));
    if (btn) btn.addEventListener('click', () => set(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
  }

  /* ---------- 6) توست ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' + msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- 7) سلة الطلب → واتساب ---------- */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('fh-cart') || '[]'); } catch (e) { cart = []; }

  const saveCart = () => {
    localStorage.setItem('fh-cart', JSON.stringify(cart));
    renderCart();
  };
  const findP = id => FS.products.find(p => p.id === id);

  function cartTotal() { return cart.reduce((s, i) => s + (findP(i.id) ? findP(i.id).price * i.q : 0), 0); }

  function renderCart() {
    const body = $('#cartBody'), cnt = $('#cartCount'), tot = $('#cartTotal');
    const keepScroll = body ? body.scrollTop : 0;
    if (cnt) cnt.textContent = String(cart.reduce((s, i) => s + i.q, 0));
    if (tot) tot.textContent = fmt(cartTotal()) + ' ريال';
    if (!body) return;
    if (!cart.length) {
      body.innerHTML = '<div class="cart-empty"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2.5 3h2.6l2.6 12.2h11L21 7H6"/></svg>سلتك فاضية.</div>';
      return;
    }
    body.innerHTML = cart.map(i => {
      const p = findP(i.id); if (!p) return '';
      const art = (FS.art && FS.art[p.id]) || '';
      return `<div class="ci" data-id="${p.id}">
        <div class="ci-img">${p.image ? `<img src="${p.image}" alt="">` : art}</div>
        <div class="ci-info"><b>${p.name}</b><span>${fmt(p.price)} ريال</span></div>
        <div class="qty"><button data-q="-1" aria-label="إنقاص"${i.q <= 1 ? ' disabled' : ''}>−</button><b>${i.q}</b><button data-q="1" aria-label="زيادة">+</button></div>
        <button class="ci-del" data-del aria-label="حذف من السلة" title="حذف"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>`;
    }).join('');
    body.scrollTop = keepScroll;
  }

  function openCart() {
    const d = $('#cartDrawer'), s = $('#scrim');
    if (d) { d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); }
    if (s) s.classList.add('show');
  }
  function closeCart() {
    const d = $('#cartDrawer'), s = $('#scrim');
    if (d) { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); }
    if (s && !$('#nav')?.classList.contains('open')) s.classList.remove('show');
  }

  function initCart() {
    renderCart();
    const btn = $('#cartBtn'), x = $('#cartClose');
    if (btn) btn.addEventListener('click', openCart);
    if (x) x.addEventListener('click', closeCart);

    document.addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      if (add) {
        const id = add.getAttribute('data-add');
        const ex = cart.find(i => i.id === id);
        if (ex) ex.q++; else cart.push({ id, q: 1 });
        saveCart();
        const p = findP(id);
        toast((p ? p.name : 'المنتج') + ' — انضاف للسلة');
        openCart();
        return;
      }
      const q = e.target.closest('[data-q]');
      if (q) {
        const row = q.closest('.ci'), id = row && row.getAttribute('data-id');
        const it = cart.find(i => i.id === id);
        if (!it) return;
        const dq = Number(q.getAttribute('data-q'));
        if (dq < 0 && it.q <= 1) return;
        it.q = Math.max(1, it.q + dq);
        saveCart();
        return;
      }
      if (e.target.closest('[data-del]')) {
        const row = e.target.closest('.ci'), id = row && row.getAttribute('data-id');
        cart = cart.filter(i => i.id !== id);
        saveCart();
      }
    });

    const send = $('#cartSend');
    if (send) send.addEventListener('click', () => {
      if (!cart.length) { toast('سلتك فاضية — أضف منتج أول'); return; }
      let msg = `السلام عليكم، أبغى أطلب من ${FS.settings.nameFull}:\n\n`;
      cart.forEach(i => {
        const p = findP(i.id); if (!p) return;
        msg += `• ${p.name} — ${i.q} × ${fmt(p.price)} = ${fmt(p.price * i.q)} ريال\n`;
      });
      msg += `\nالإجمالي التقديري: ${fmt(cartTotal())} ريال\n`;
      msg += `\nالاسم: \nالحي: \nالوقت المناسب للزيارة: `;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
  }

  /* ---------- 8) فلاتر المنتجات ---------- */
  function initFilters() {
    const grid = $('#pgrid'), bar = $('#filters'), sel = $('#sortSel'), empty = $('#pempty');
    if (!grid || !bar || bar.dataset.bound) return;
    bar.dataset.bound = '1';
    let cur = new URLSearchParams(location.search).get('cat') || 'all';

    const apply = () => {
      const cards = $$('.pcard', grid);
      let visible = 0;
      cards.forEach(c => {
        const ok = cur === 'all' || c.getAttribute('data-cat') === cur;
        c.style.display = ok ? '' : 'none';
        if (ok) visible++;
      });
      if (empty) empty.hidden = visible > 0;
      $$('.fchip', bar).forEach(b => b.classList.toggle('is-on', b.getAttribute('data-f') === cur));
    };

    bar.addEventListener('click', e => {
      const b = e.target.closest('.fchip'); if (!b) return;
      cur = b.getAttribute('data-f');
      const u = new URL(location.href);
      if (cur === 'all') u.searchParams.delete('cat'); else u.searchParams.set('cat', cur);
      history.replaceState({}, '', u);
      apply();
    });

    if (sel) sel.addEventListener('change', () => {
      const cards = $$('.pcard', grid);
      const v = sel.value;
      cards.sort((a, b) => {
        const pa = findP(a.getAttribute('data-id')) || {}, pb = findP(b.getAttribute('data-id')) || {};
        if (v === 'price-asc') return (pa.price || 0) - (pb.price || 0);
        if (v === 'price-desc') return (pb.price || 0) - (pa.price || 0);
        if (v === 'name') return String(pa.name).localeCompare(String(pb.name), 'ar');
        return (pb.badge ? 1 : 0) - (pa.badge ? 1 : 0);
      });
      cards.forEach(c => grid.appendChild(c));
    });

    apply();
  }

  /* ---------- 9) معالج اختيار الجهاز ---------- */
  function initForm() {
    const f = $('#quoteForm'); if (!f || f.dataset.bound) return;
    f.dataset.bound = '1';
    f.addEventListener('submit', e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f).entries());
      if (!d.name || !d.phone) { toast('اكتب الاسم ورقم الجوال الله يعافيك'); return; }
      const msg = `السلام عليكم ${FS.settings.nameFull}،%0A%0A`
        + `*الاسم:* ${d.name}%0A*الجوال:* ${d.phone}%0A*نوع الطلب:* ${d.type}%0A`
        + (d.area ? `*الحي:* ${d.area}%0A` : '')
        + (d.msg ? `*التفاصيل:* ${d.msg}` : '');
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(decodeURIComponent(msg))}`, '_blank', 'noopener');
      toast('جهزنا رسالتك — بيفتح واتساب الحين');
    });
  }

  /* ---------- 13) شاشة افتتاحية ---------- */

  /* ---------- 14) فقاعة واتساب ---------- */

  /* ---------- 15) مقارنة قبل / بعد ---------- */
  function initSW() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  /* تهيئة المحتوى الديناميكي — تُستدعى مرة عند التحميل ومرة بعد كل تنقّل في النسخة المستقلة */
  /* نقرة على كرت المنتج = فتح صفحة المنتج (زي أمازون) */
  function initCardLinks() {
    document.addEventListener('click', e => {
      const card = e.target.closest('.pcard');
      if (!card) return;
      if (e.target.closest('a,button')) return; // الأزرار والروابط تبقى بوظيفتها
      const id = card.dataset.id;
      if (id) location.href = '/product/' + id;
    });
  }

  /* لايت بوكس: صورة مكبرة بملء الشاشة مع تقليب وسحب */
  function makeLightbox() {
    const lb = document.createElement('div');
    lb.className = 'lb'; lb.hidden = true;
    lb.innerHTML = '<button class="lb-x" type="button" aria-label="إغلاق">✕</button>' +
      '<button class="lb-arrow lb-prev" type="button" aria-label="السابق"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<div class="lb-stage"><img alt=""></div>' +
      '<button class="lb-arrow lb-next" type="button" aria-label="التالي"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<div class="lb-count"></div>';
    document.body.appendChild(lb);
    const img = lb.querySelector('img'), cnt = lb.querySelector('.lb-count');
    let imgs = [], idx = 0;
    const show = i => {
      idx = (i + imgs.length) % imgs.length;
      img.src = imgs[idx];
      cnt.textContent = (idx + 1) + ' / ' + imgs.length;
      lb.classList.toggle('lb-single', imgs.length < 2);
    };
    const open = (list, i) => {
      imgs = list; show(i);
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
    };
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; };
    lb.querySelector('.lb-x').addEventListener('click', close);
    lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
    lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx + 1);
      else if (e.key === 'ArrowRight') show(idx - 1);
    });
    let sx = 0, sy = 0, sw = false;
    lb.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; sw = true; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (!sw) return; sw = false;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) show(dx < 0 ? idx + 1 : idx - 1);
    }, { passive: true });
    return open;
  }
  let lbOpen = null;

  function initGallery() {
    document.querySelectorAll('[data-gal]').forEach(gal => {
      const slides = Array.from(gal.querySelectorAll('.gal-slide'));
      const thumbs = Array.from(gal.querySelectorAll('.gal-thumb'));
      const stage = gal.querySelector('.gal-stage');
      const countB = gal.querySelector('.gal-count b');
      if (slides.length < 2 || !stage) return;
      let idx = 0;
      const show = (i, doScroll) => {
        idx = (i + slides.length) % slides.length;
        slides.forEach((s, k) => s.classList.toggle('is-on', k === idx));
        thumbs.forEach((t, k) => {
          t.classList.toggle('is-active', k === idx);
          if (k === idx && doScroll !== false) { try { t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (e) {} }
        });
        if (countB) countB.textContent = String(idx + 1);
      };
      // نقرة على الصورة الرئيسية = تكبير بملء الشاشة
      const imgList = slides.map(s2 => { const im = s2.querySelector('img'); return im ? im.getAttribute('src') : ''; }).filter(Boolean);
      if (imgList.length) {
        stage.addEventListener('click', e => {
          if (e.target.closest('.gal-arrow')) return;
          if (!e.target.closest('.gal-slide img')) return;
          if (!lbOpen) lbOpen = makeLightbox();
          lbOpen(imgList, idx);
        });
      }
      const nx = gal.querySelector('.gal-next'), pv = gal.querySelector('.gal-prev');
      if (nx) nx.addEventListener('click', () => show(idx + 1));
      if (pv) pv.addEventListener('click', () => show(idx - 1));
      thumbs.forEach((t, k) => t.addEventListener('click', () => show(k)));
      // سحب بالجوال
      let sx = 0, sy = 0, sw = false;
      stage.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; sw = true; }, { passive: true });
      stage.addEventListener('touchend', e => {
        if (!sw) return; sw = false;
        const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) show(dx < 0 ? idx + 1 : idx - 1);
      }, { passive: true });
      // أسهم الكيبورد (RTL: يسار = التالي)
      document.addEventListener('keydown', e => {
        if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
        if (e.key === 'ArrowLeft') show(idx + 1);
        else if (e.key === 'ArrowRight') show(idx - 1);
      });
      show(0, false);
    });
  }

  function initDynamic() {
    injectArt(); initReveal(); initCounters();
    initFilters(); initForm(); initGallery(); initCardLinks();
  }
  window.FH_init = initDynamic;

  document.addEventListener('DOMContentLoaded', () => {
    initDynamic();
    initHeader(); initTheme(); initCart(); initSW();
    document.documentElement.classList.add('js-ready');
  });
})();

/* ---------- شريط سفلي: ورقة المزيد ---------- */
(function(){
  var btn=document.getElementById('mbarMore'), hd=document.getElementById('btnMore'), sh=document.getElementById('msheet'), bd=document.getElementById('msheetBd');
  if(!sh||!bd) return;
  var set=function(on){ sh.classList.toggle('on',on); bd.classList.toggle('on',on); if(btn) btn.setAttribute('aria-expanded',String(on)); if(hd) hd.setAttribute('aria-expanded',String(on)); };
  if(btn) btn.addEventListener('click',function(){ set(!sh.classList.contains('on')); });
  if(hd) hd.addEventListener('click',function(){ set(!sh.classList.contains('on')); });
  bd.addEventListener('click',function(){ set(false); });
  sh.addEventListener('click',function(e){ if(e.target.closest('a')) set(false); });
})();
