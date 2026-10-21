<?php
/* ===== نظام العرض — نقل حرفي من lib/render.js (نفس الـHTML بايت-ببايت) ===== */
require_once __DIR__ . '/util.php';
require_once __DIR__ . '/art.php';

const CURRENT_VERSION = '43';

function productImage($p) {
  $src = jT($p['image'] ?? null) ? $p['image'] : '';
  if (!jT($src) && is_array($p['images'] ?? null) && count($p['images'])) $src = $p['images'][0];
  if (jT($src)) return '<img src="' . esc($src) . '" alt="' . esc($p['name']) . '" loading="lazy" class="pimg">';
  return '<div class="part" data-art="' . esc($p['id']) . '" aria-label="' . esc($p['name']) . '"></div>';
}

function productGallery($p) {
  $imgs = [];
  $add = function ($u) use (&$imgs) { if (jT($u) && !in_array($u, $imgs, true)) $imgs[] = $u; };
  $add($p['image'] ?? null);
  foreach ((isset($p['images']) && is_array($p['images'])) ? $p['images'] : [] as $u) $add($u);
  if (!$imgs) {
    return '<div class="gal"><div class="gal-stage"><div class="gal-slide is-on"><div class="part" data-art="' . esc($p['id']) . '" aria-label="' . esc($p['name']) . '"></div></div></div></div>';
  }
  $chev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  $multi = count($imgs) > 1;
  $slides = '';
  foreach ($imgs as $i => $u) {
    $on = $i === 0 ? ' is-on' : '';
    $load = $i === 0 ? 'eager' : 'lazy';
    $n1 = $i + 1;
    $slides .= '<div class="gal-slide' . $on . '"><img src="' . esc($u) . '" alt="' . esc($p['name']) . ' — صورة ' . $n1 . '" loading="' . $load . '"></div>';
  }
  $total = count($imgs);
  $arrows = $multi
    ? '<button class="gal-arrow gal-prev" type="button" aria-label="الصورة السابقة">' . $chev . '</button>'
      . "\n      " . '<button class="gal-arrow gal-next" type="button" aria-label="الصورة التالية">' . $chev . '</button>'
      . "\n      " . '<div class="gal-count"><b>1</b> / ' . $total . '</div>'
    : '';
  return '<div class="gal" data-gal>'
    . "\n    " . '<div class="gal-stage">'
    . "\n      " . $slides
    . "\n      " . $arrows
    . "\n    </div>"
    . "\n\n  </div>";
}

function sectionHead($eyebrow, $title, $sub) {
  $e = jT($eyebrow) ? '<span class="eyebrow">' . esc($eyebrow) . '</span>' : '';
  $s = jT($sub) ? '<p>' . esc($sub) . '</p>' : '';
  return "\n" . '<div class="sec-head reveal">'
    . "\n  " . $e
    . "\n  " . '<h2>' . $title . '</h2>'
    . "\n  " . $s
    . "\n</div>";
}

function wave($cls = '') {
  return '<div class="wave ' . $cls . '" aria-hidden="true"><svg viewBox="0 0 1440 90" preserveAspectRatio="none"><path d="M0 40 Q240 0 480 35 T960 35 T1440 30 V90 H0Z"/></svg></div>';
}

function productCard($p, $cat, $data, $hasArt = true) {
  $s = $data['settings'];
  $art = $hasArt;
  $off = 0;
  if (jT($p['oldPrice'] ?? null) && $p['oldPrice'] > $p['price']) {
    $off = (int)round((1 - $p['price'] / $p['oldPrice']) * 100);
  }
  if ((float)($p['price'] ?? 0) > 0) {
    $priceHTML = (jT($p['oldPrice'] ?? null) && $p['oldPrice'] > $p['price'] ? '<s>' . money($p['oldPrice']) . '</s>' : '')
      . '<b>' . money($p['price']) . '</b><span class="cur" role="img" aria-label="ريال"></span>';
  } else {
    $priceHTML = '<b class="price-call">السعر بالتواصل</b>';
  }
  $waHref = waLink($s, 'السلام عليكم، أبغى أستفسر عن: ' . $p['name'] . ((float)($p['price'] ?? 0) > 0 ? ' (' . money($p['price']) . ' ريال)' : '') . ' — ' . $s['nameFull']);
  $sp1 = jT($p['stages'] ?? null) ? '<li>' . $p['stages'] . ' مراحل</li>' : '';
  $sp2 = (jT($p['output'] ?? null) && $p['output'] !== '—') ? '<li>' . esc($p['output']) . '</li>' : '';
  $sp3 = (jT($p['warranty'] ?? null) && $p['warranty'] !== '—') ? '<li>ضمان ' . esc($p['warranty']) . '</li>' : '';
  $sp4 = jT($p['installIncluded'] ?? null) ? '<li>تركيب مجاني</li>' : '';
  $flag = jT($p['badge'] ?? null) ? '<span class="flag">' . esc($p['badge']) . '</span>' : '';
  $offTag = $off ? '<span class="off">وفّر ' . $off . '%</span>' : '';
  $stockTag = (jT($p['stock'] ?? null) && $p['stock'] !== 'متوفر') ? '<span class="stock">' . esc($p['stock']) . '</span>' : '';
  $addBtn = ($art && (float)($p['price'] ?? 0) > 0) ? '<button class="btn btn--ghost btn--xs" data-add="' . esc($p['id']) . '">' . icon('cart') . ' أضف</button>' : '';
  $pid = esc($p['id']); $pcat = esc($p['category']);
  return '<article class="card pcard reveal" data-cat="' . $pcat . '" data-id="' . $pid . '">'
    . "\n    " . '<a class="pcard-media pcard-link" href="/product/' . $pid . '" aria-label="' . esc($p['name']) . ' — عرض الصور والتفاصيل">'
    . "\n      " . productImage($p)
    . "\n      " . $flag
    . "\n      " . $offTag
    . "\n      " . $stockTag
    . "\n      " . '<span class="pcard-zoom" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>'
    . "\n    </a>"
    . "\n    " . '<div class="pcard-body">'
    . "\n      " . '<span class="pcard-cat">' . icon($cat['icon']) . ' ' . esc($cat['short']) . '</span>'
    . "\n      " . '<h3><a class="pcard-title" href="/product/' . $pid . '">' . esc($p['name']) . '</a></h3>'
    . "\n      " . '<p class="pcard-desc">' . esc($p['desc']) . '</p>'
    . "\n      " . '<ul class="specs">'
    . "\n        " . $sp1
    . "\n        " . $sp2
    . "\n        " . $sp3
    . "\n        " . $sp4
    . "\n      </ul>"
    . "\n      " . '<div class="pcard-foot">'
    . "\n        " . '<div class="price">'
    . "\n          " . $priceHTML
    . "\n        </div>"
    . "\n        " . '<div class="pcard-acts">'
    . "\n          " . $addBtn
    . "\n          " . '<a class="btn btn--wa btn--xs" target="_blank" rel="noopener" href="' . $waHref . '">' . icon('wa') . ' اطلب</a>'
    . "\n        </div>"
    . "\n      </div>"
    . "\n    </div>"
    . "\n  </article>";
}

/* ---------- القالب العام ---------- */
function render_layout($opts) {
  $title = $opts['title']; $desc = $opts['desc']; $body = $opts['body'];
  $active = $opts['active'] ?? ''; $data = $opts['data'];
  $extraHead = $opts['extraHead'] ?? ''; $jsonLd = $opts['jsonLd'] ?? ''; $canonical = $opts['canonical'] ?? '';
  $needArt = $opts['needArt'] ?? true;
  $s = $data['settings'];
  $fkey = isset($s['font']) && isset(SITE_FONTS[$s['font']]) ? $s['font'] : 'tajawal';
  $fsObj = str_replace('</', '<\\/', jsJSON([
    'products' => $needArt ? $data['products'] : [],
    'categories' => $data['categories'],
    'settings' => $s,
  ]));
  $artTag = '<script>window.FS = ' . $fsObj . ';</script>' . ($needArt ? '<script src="/assets/js/art.js?v=' . CURRENT_VERSION . '" defer></script>' : '');
  $st = openState($s);
  $year = (int)date('Y');
  $nav = [['/', 'الرئيسية', 'home'], ['/products', 'المنتجات', 'products'], ['/services', 'الخدمات', 'services'], ['/about', 'من نحن', 'about'], ['/contact', 'تواصل معنا', 'contact']];
  $hours = asArr($s['hours'] ?? []);
  $dowEn = ['sunday' => 'Sunday', 'monday' => 'Monday', 'tuesday' => 'Tuesday', 'wednesday' => 'Wednesday', 'thursday' => 'Thursday', 'friday' => 'Friday', 'saturday' => 'Saturday'];
  $oh = [];
  foreach (DAY_KEYS as $k) {
    $h = asArr($hours[$k] ?? []);
    if ($h && !jT($h['closed'] ?? null)) {
      $e = ['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => $dowEn[$k]];
      if (isset($h['open'])) $e['opens'] = $h['open'];
      if (isset($h['close'])) $e['closes'] = $h['close'];
      $oh[] = $e;
    }
  }
  $jsonLdFull = [
    '@context' => 'https://schema.org',
    '@type' => 'LocalBusiness',
    'name' => $s['nameFull'],
    'description' => $desc,
    'telephone' => $s['phoneDisplay'],
    'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'الرياض', 'addressCountry' => 'SA', 'streetAddress' => $s['address']],
    'openingHoursSpecification' => $oh,
  ];
  if (jT($s['maps'] ?? null)) $jsonLdFull['hasMap'] = $s['maps'];
  if (jT($s['rating'] ?? null)) {
    $ag = ['@type' => 'AggregateRating', 'ratingValue' => $s['rating']];
    if (isset($s['reviewsCount'])) $ag['reviewCount'] = $s['reviewsCount'];
    $jsonLdFull['aggregateRating'] = $ag;
  }
  $ld = str_replace('undefined', 'null', jsJSON($jsonLdFull));
  $canonicalTag = jT($canonical) ? '<link rel="canonical" href="' . esc($canonical) . '">' : '';
  $jsonLd2 = jT($jsonLd) ? "\n" . '<script type="application/ld+json">' . $jsonLd . '</script>' : '';

  $navHTML = '';
  foreach ($nav as $n) {
    $cls = $n[2] === $active ? 'is-active' : '';
    $navHTML .= '<a href="' . $n[0] . '" class="' . $cls . '">' . esc($n[1]) . '</a>';
  }

  $uni = hoursUniform($hours);
  if ($uni !== null) {
    $hoursBlock = '<ul class="hours"><li><span>كل أيام الأسبوع</span><b>' . $uni . '</b></li></ul>';
  } else {
    $items = '';
    foreach (array_reverse(DAY_KEYS) as $k) {
      $h = asArr($hours[$k] ?? []);
      $clsToday = ($k === DAY_KEYS[riyadhNow()['dow']]) ? 'is-today' : '';
      $val = jT($h['closed'] ?? null) ? 'مغلق' : (fmtShort($h['open'] ?? '') . ' – ' . fmtShort($h['close'] ?? ''));
      $items .= '<li class="' . $clsToday . '"><span>' . DAY_AR[$k] . '</span><b>' . $val . '</b></li>';
    }
    $hoursBlock = "<ul class=\"hours\">\n        " . $items . "\n      </ul>";
  }

  $social = asArr($s['social'] ?? []);
  $socItem = function ($k, $aria, $txt) use ($social) {
    return jT($social[$k] ?? null) ? '<a href="' . esc($social[$k]) . '" target="_blank" rel="noopener" aria-label="' . $aria . '">' . $txt . '</a>' : '';
  };
  $socLine = $socItem('instagram', 'انستقرام', 'IG')
    . "\n        " . $socItem('snapchat', 'سناب شات', 'SC')
    . "\n        " . $socItem('tiktok', 'تيك توك', 'TT')
    . "\n        " . $socItem('twitter', 'إكس', 'X');

  $footCats = '';
  foreach (array_slice($data['categories'], 0, 6) as $c) $footCats .= '<li><a href="/products?cat=' . esc($c['id']) . '">' . esc($c['name']) . '</a></li>';

  $emailLi = jT($s['email'] ?? null) ? '<li><a href="mailto:' . esc($s['email']) . '">' . icon('mail') . ' ' . esc($s['email']) . '</a></li>' : '';

  $legalA = (jT($s['crNumber'] ?? null) && $s['crNumber'] !== '—') ? 'س.ت: ' . esc($s['crNumber']) : '';
  $legalB = jT($s['unifiedNumber'] ?? null) ? ' · الرقم الموحد: ' . esc($s['unifiedNumber']) : '';
  $legalC = jT($s['vatNumber'] ?? null) ? ' · الرقم الضريبي: ' . esc($s['vatNumber']) : '';
  $legalD = jT($s['taxNote'] ?? null) ? ' · ' . esc($s['taxNote']) : '';

  $pillClass = $st['open'] ? 'pill--on' : 'pill--off';
  $logoUrl = esc(jT($s['logoUrl'] ?? null) ? $s['logoUrl'] : '/assets/logo/logo-lockup-t.png');
  $logoFull = esc(jT($s['logoFullUrl'] ?? null) ? $s['logoFullUrl'] : '/assets/logo/logo-lockup-t.png');

  return '<!DOCTYPE html>'
    . "\n" . '<html lang="ar" dir="rtl" data-font="' . $fkey . '">'
    . "\n" . '<head>'
    . "\n" . '<meta charset="UTF-8">'
    . "\n" . '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    . "\n" . '<title>' . esc($title) . '</title>'
    . "\n" . '<meta name="description" content="' . esc($desc) . '">'
    . "\n" . '<meta name="theme-color" content="#073B57">'
    . "\n" . '<link rel="icon" type="image/png" href="/assets/favicon.png">'
    . "\n" . '<link rel="apple-touch-icon" href="/assets/logo/icon-192.png">'
    . "\n" . '<link rel="manifest" href="/manifest.webmanifest">'
    . "\n" . '<link rel="preconnect" href="https://fonts.googleapis.com">'
    . "\n" . '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    . "\n" . '<link href="https://fonts.googleapis.com/css2?family=' . SITE_FONTS[$fkey]['q'] . '&display=swap" rel="stylesheet">'
    . "\n" . '<link rel="stylesheet" href="/assets/css/style.css?v=' . CURRENT_VERSION . '">'
    . "\n" . $canonicalTag
    . "\n" . '<meta property="og:title" content="' . esc($title) . '">'
    . "\n" . '<meta property="og:description" content="' . esc($desc) . '">'
    . "\n" . '<meta property="og:type" content="website">'
    . "\n" . '<meta property="og:image" content="/assets/logo/logo-full-1200.png">'
    . "\n" . '<meta property="og:locale" content="ar_SA">'
    . "\n" . '<script type="application/ld+json">' . $ld . '</script>' . $jsonLd2
    . "\n" . $extraHead
    . "\n" . '</head>'
    . "\n" . '<body class="' . $active . '">'
    . "\n" . '<a class="skip" href="#main">انتقل للمحتوى</a>'
    . "\n\n" . '<header class="hdr" id="hdr">'
    . "\n" . '  <div class="hdr-top">'
    . "\n" . '    <div class="wrap hdr-top-in">'
    . "\n" . '      <div class="hdr-pills">'
    . "\n" . '        <span class="pill ' . $pillClass . '"><i class="dot"></i>' . esc($st['label']) . '<b>' . esc($st['detail']) . '</b></span>'
    . "\n" . '        <span class="pill pill--ghost hide-sm">تركيب مجاني داخل الرياض</span>'
    . "\n" . '        <span class="pill pill--ghost hide-sm">ضمان سنتان</span>'
    . "\n" . '      </div>'
    . "\n" . '      <div class="hdr-top-links">'
    . "\n" . '        <a href="tel:' . tel($s['phone']) . '" class="tlink">' . icon('phone') . '<span>' . esc($s['phoneDisplay']) . '</span></a>'
    . "\n" . '        <span class="vsep"></span>'
    . "\n" . '        <button class="theme-btn" id="themeBtn" aria-label="تبديل الوضع الليلي">' . icon('moon') . '</button>'
    . "\n" . '      </div>'
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '  <div class="hdr-main">'
    . "\n" . '    <div class="wrap hdr-main-in">'
    . "\n" . '      <button class="hdots" id="btnMore" type="button" aria-label="القائمة والخيارات" aria-expanded="false"><span class="lines3" aria-hidden="true"><i></i><i></i><i></i></span></button>'
    . "\n" . '      <a class="brand" href="/">'
    . "\n" . '        <img class="brand-logo" src="' . $logoUrl . '" alt="' . esc($s['name']) . '">'
    . "\n" . '      </a>'
    . "\n" . '      <nav class="nav" id="nav">'
    . "\n" . '        ' . $navHTML
    . "\n" . '      </nav>'
    . "\n" . '      <div class="hdr-cta">'
    . "\n" . '        <button class="cart-btn" id="cartBtn" aria-label="سلة الطلب">' . icon('cart') . '<span class="cart-count" id="cartCount">0</span></button>'
    . "\n" . '        <a class="btn btn--wa btn--sm" href="' . waLink($s) . '" target="_blank" rel="noopener">' . icon('wa') . ' اطلب واتساب</a>'
    . "\n" . '        '
    . "\n" . '      </div>'
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '  <div class="nav-progress"><i id="navProgress"></i></div>'
    . "\n" . '</header>'
    . "\n\n" . '<main id="main">'
    . "\n" . $body
    . "\n" . '</main>'
    . "\n\n" . '<footer class="ftr">'
    . "\n" . '  <div class="ftr-wave" aria-hidden="true">'
    . "\n" . '    <svg viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 60 Q180 20 360 55 T720 55 T1080 55 T1440 55 V120 H0 Z" fill="currentColor"/></svg>'
    . "\n" . '  </div>'
    . "\n" . '  <div class="wrap ftr-grid">'
    . "\n" . '    <div class="ftr-col ftr-brand">'
    . "\n" . '      <span class="flogo"><img src="' . $logoFull . '" alt="' . esc($s['nameFull']) . '"></span>'
    . "\n" . '      <p>' . esc($s['tagline']) . ' — ' . esc($s['coverage']) . '.</p>'
    . "\n" . '      <div class="ftr-social">'
    . "\n" . '        ' . $socLine
    . "\n" . '      </div>'
    . "\n" . '    </div>'
    . "\n" . '    <div class="ftr-col">'
    . "\n" . '      <h4>أقسام المنتجات</h4>'
    . "\n" . '      <ul>' . $footCats . '</ul>'
    . "\n" . '    </div>'
    . "\n" . '    <div class="ftr-col">'
    . "\n" . '      <h4>أوقات العمل</h4>'
    . "\n" . '      ' . $hoursBlock
    . "\n" . '    </div>'
    . "\n" . '    <div class="ftr-col">'
    . "\n" . '      <h4>تواصل معنا</h4>'
    . "\n" . '      <ul class="contact-list">'
    . "\n" . '        <li><a href="tel:' . tel($s['phone']) . '">' . icon('phone') . ' ' . esc($s['phoneDisplay']) . '</a></li>'
    . "\n" . '        <li><a href="' . waLink($s) . '" target="_blank" rel="noopener">' . icon('wa') . ' واتساب للطلبات</a></li>'
    . "\n" . '        ' . $emailLi
    . "\n" . '        <li><a href="' . esc($s['maps']) . '" target="_blank" rel="noopener">' . icon('pin') . ' ' . esc($s['address']) . '</a></li>'
    . "\n" . '      </ul>'
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '  <div class="ftr-bottom">'
    . "\n" . '    <div class="wrap ftr-bottom-in">'
    . "\n" . '      <p>© ' . $year . ' ' . esc($s['nameFull']) . ' — جميع الحقوق محفوظة.</p>'
    . "\n" . '      <p class="ftr-legal">'
    . "\n" . '        ' . $legalA
    . "\n" . '        ' . $legalB
    . "\n" . '        ' . $legalC
    . "\n" . '        ' . $legalD
    . "\n" . '      </p>'
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '</footer>'
    . "\n\n\n" . '<!-- أزرار عائمة -->'
    . "\n" . '<div class="fab-stack">'
    . "\n" . '  <a class="fab fab--map" href="' . esc($s['maps']) . '" target="_blank" rel="noopener" aria-label="الموقع">' . icon('pin') . '</a>'
    . "\n" . '  <button class="fab fab--top" id="toTop" aria-label="أعلى الصفحة">' . icon('chev') . '</button>'
    . "\n" . '</div>'
    . "\n\n" . '<!-- سلة الطلب -->'
    . "\n" . '<aside class="drawer" id="cartDrawer" aria-hidden="true">'
    . "\n" . '  <div class="drawer-head">'
    . "\n" . '    <h3>سلة الطلب</h3>'
    . "\n" . '    <button class="drawer-x" id="cartClose" aria-label="إغلاق">' . icon('x') . '</button>'
    . "\n" . '  </div>'
    . "\n" . '  <div class="drawer-body" id="cartBody"></div>'
    . "\n" . '  <div class="drawer-foot">'
    . "\n" . '    <div class="cart-total"><span>الإجمالي</span><b id="cartTotal">0</b></div>'
    . "\n" . '    <button class="btn btn--wa btn--block" id="cartSend">' . icon('wa') . ' أرسل الطلب عبر واتساب</button>'
    . "\n" . '  </div>'
    . "\n" . '</aside>'
    . "\n" . '<div class="scrim" id="scrim"></div>'
    . "\n\n" . '<div class="toast" id="toast" role="status" aria-live="polite"></div>'
    . "\n\n" . $artTag
    . "\n" . '<script src="/assets/js/app.js?v=' . CURRENT_VERSION . '" defer></script>'
    . "\n" . '  <div class="msheet-bd" id="msheetBd"></div>'
    . "\n" . '  <div class="msheet" id="msheet" role="dialog" aria-label="خيارات إضافية">'
    . "\n" . '    <a href="/">' . icon('home') . ' الرئيسية</a>'
    . "\n" . '    <a href="/products">' . icon('cart') . ' المنتجات</a>'
    . "\n" . '    <a href="/services">' . icon('wrench') . ' الخدمات</a>'
    . "\n" . '    <a href="/about">' . icon('shield') . ' من نحن</a>'
    . "\n" . '    <a href="/contact">' . icon('phone') . ' تواصل معنا</a>'
    . "\n" . '    <a href="/products?cat=parts">' . icon('part') . ' قطع الغيار</a>'
    . "\n" . '    <a href="https://wa.me/9665313653" target="_blank" rel="noopener">' . icon('wa') . ' واتساب</a>'
    . "\n" . '    <a href="tel:0531365453">' . icon('phone') . ' اتصال مباشر</a>'
    . "\n" . '  </div>'
    . "\n" . '</body>'
    . "\n" . '</html>';
}

/* ---------- الصفحات ---------- */
function findCat($data, $id) {
  foreach ($data['categories'] as $c) if (($c['id'] ?? null) === $id) return $c;
  return $data['categories'][0];
}

function pageHome($data) {
  $s = $data['settings'];
  $withBadge = array_values(array_filter($data['products'], fn($p) => jT($p['badge'] ?? null)));
  $without = array_values(array_filter($data['products'], fn($p) => !jT($p['badge'] ?? null)));
  $featured = array_slice(array_merge(array_slice($withBadge, 0, 3), $without), 0, 6);
  $cats = '';
  foreach ($data['categories'] as $c) {
    $count = count(array_filter($data['products'], fn($p) => ($p['category'] ?? null) === $c['id']));
    $cats .= '<a class="cat reveal" href="/products?cat=' . esc($c['id']) . '">'
      . "\n          " . '<h3>' . esc($c['name']) . '</h3>'
      . "\n          " . '<p>' . esc($c['desc']) . '</p>'
      . "\n          " . '<span class="cat-more">' . $count . ' صنف</span>'
      . "\n        </a>";
  }
  $feat = '';
  foreach ($featured as $p) $feat .= productCard($p, findCat($data, $p['category'] ?? null), $data);
  $srv = '';
  foreach ($data['services'] as $sv) {
    $bul = '';
    foreach ($sv['bullets'] as $b) $bul .= '<li>' . esc($b) . '</li>';
    $srv .= '<article class="scard reveal">'
      . "\n        " . '<h3>' . esc($sv['title']) . '</h3>'
      . "\n        " . '<p>' . esc($sv['desc']) . '</p>'
      . "\n        " . '<ul>' . $bul . '</ul>'
      . "\n      </article>";
  }
  $faqs = '';
  foreach ($data['faqs'] as $f) {
    $faqs .= '<details class="faq-i">'
      . "\n          " . '<summary>' . esc($f['q']) . '<span class="faq-ic">' . icon('chev') . '</span></summary>'
      . "\n          " . '<div class="faq-a"><p>' . esc($f['a']) . '</p></div>'
      . "\n        </details>";
  }
  $body = "\n" . '<!-- ===== البطل ===== -->'
    . "\n" . '<section class="hero">'
    . "\n" . '  <div class="hero-bg" aria-hidden="true">'
    . "\n" . '    <div class="hero-glow"></div>'
    . "\n" . '    <div class="hero-grid"></div>'
    . "\n" . '  </div>'
    . "\n" . '  <div class="wrap hero-in">'
    . "\n" . '    <div class="hero-copy">'
    . "\n" . '      <span class="eyebrow eyebrow--light reveal">' . esc($s['coverage']) . ' · استجابة خلال ' . esc($s['responseTime']) . ' ساعة</span>'
    . "\n" . '      <h1 class="reveal">ماءٌ <em>عذب</em>…<br>في كل بيت</h1>'
    . "\n" . '      <p class="lead reveal">' . esc($s['heroText']) . '</p>'
    . "\n" . '      <div class="hero-cta reveal">'
    . "\n" . '        <a class="btn btn--glass btn--lg" href="/products">تصفّح المنتجات</a>'
    . "\n" . '      </div>'
    . "\n" . '      <ul class="hero-badges reveal">'
    . "\n" . '        <li>' . icon('check') . ' ' . (jT($s['freeCheckup'] ?? null) ? 'فحص مياه مجاني' : 'فحص مياه') . '</li>'
    . "\n" . '        <li>' . icon('check') . ' ' . (jT($s['freeInstall'] ?? null) ? 'تركيب مجاني' : 'تركيب') . '</li>'
    . "\n" . '        <li>' . icon('check') . ' ضمان سنتان</li>'
    . "\n" . '        <li>' . icon('check') . ' تذكير صيانة تلقائي</li>'
    . "\n" . '      </ul>'
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '  ' . wave('hero-wave')
    . "\n" . '</section>'
    . "\n\n" . '<!-- ===== الأقسام ===== -->'
    . "\n" . '<section class="sec">'
    . "\n" . '  <div class="wrap">
    ' . sectionHead('أقسامنا', 'كل ما يخص الماء تحت سقف واحد', 'من جهاز تحت المجلى إلى محطة مركزية لفيلا أو مطعم — اختر القسم وتصفّح')
    . "\n" . '    <div class="cats">'
    . "\n      " . $cats
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '</section>'
    . "\n\n" . '<!-- ===== المنتجات المميزة ===== -->'
    . "\n" . '<section class="sec sec--alt">'
    . "\n" . '  <div class="wrap">
    ' . sectionHead('الأكثر طلباً', 'منتجات مختارة من معرضنا', 'الأسعار نهائية وتشمل التركيب داخل الرياض')
    . "\n" . '    <div class="grid grid--3">'
    . "\n      " . $feat
    . "\n" . '    </div>'
    . "\n" . '    <div class="center reveal"><a class="btn btn--ink btn--lg" href="/products">شوف كل المنتجات</a></div>'
    . "\n" . '  </div>'
    . "\n" . '</section>'
    . "\n\n" . '<!-- ===== الخدمات ===== -->'
    . "\n" . '<section class="sec">'
    . "\n" . '  <div class="wrap">
    ' . sectionHead('خدماتنا', 'بيع… وتركيب… ومتابعة ما تنقطع', 'ما ننتهي عند البيع — نبقى معك طول عمر الجهاز')
    . "\n" . '    <div class="grid grid--3 srv-strip">'
    . "\n      " . $srv
    . "\n" . '    </div>'
    . "\n" . '    <div class="center reveal"><a class="btn btn--ink" href="/services">تفاصيل الخدمات</a></div>'
    . "\n" . '  </div>'
    . "\n" . '</section>'
    . "\n\n" . '<!-- ===== شريط CTA ===== -->'
    . "\n" . '<section class="cta">'
    . "\n" . '  <div class="wrap cta-in reveal">'
    . "\n" . '    <div>'
    . "\n" . '      <h2>محتار أي جهاز يناسب موية بيتك؟</h2>'
    . "\n" . '      <p>أرسل لنا موقعك على واتساب ويوصلك فني يقيس الملوحة <b>مجاناً</b> — بدون أي التزام إنك تشتري.</p>'
    . "\n" . '    </div>'
    . "\n" . '    <div class="cta-btns">'
    . "\n" . '      <a class="btn btn--gold btn--lg" href="' . waLink($s, 'السلام عليكم، أبغى فحص مويه مجاني عشان أعرف الجهاز المناسب — ' . $s['nameFull']) . '" target="_blank" rel="noopener">' . icon('wa') . ' احجز فحص مجاني</a>'
    . "\n" . '      <a class="btn btn--glass btn--lg" href="tel:' . tel($s['phone']) . '">' . icon('phone') . ' ' . esc($s['phoneDisplay']) . '</a>'
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '</section>'
    . "\n\n" . '<!-- ===== الأسئلة الشائعة ===== -->'
    . "\n" . '<section class="sec sec--alt">'
    . "\n" . '  <div class="wrap wrap--narrow">
    ' . sectionHead('أسئلة متكررة', 'إجابات سريعة قبل ما تتصل', '')
    . "\n" . '    <details class="faq-i faq-all reveal">'
    . "\n" . '      <summary>اضغط لعرض الأسئلة الشائعة<span class="faq-ic">' . icon('chev') . '</span></summary>'
    . "\n" . '      <div class="faq-a"><div class="faq">'
    . "\n        " . $faqs
    . "\n      </div></div>"
    . "\n" . '    </details>'
    . "\n" . '  </div>'
    . "\n" . '</section>';
  return render_layout(['title' => $s['nameFull'] . ' | ' . $s['tagline'], 'desc' => mb_substr($s['heroText'], 0, 155), 'body' => $body, 'active' => 'home', 'data' => $data]);
}

function pageProducts($data, $query = []) {
  $s = $data['settings'];
  $cat = $query['cat'] ?? 'all';
  $chips = '<button class="fchip ' . ($cat === 'all' ? 'is-on' : '') . '" data-f="all">الكل <b>' . count($data['products']) . '</b></button>' . "\n        ";
  foreach ($data['categories'] as $c) {
    $n = count(array_filter($data['products'], fn($p) => ($p['category'] ?? null) === $c['id']));
    $chips .= '<button class="fchip ' . ($cat === $c['id'] ? 'is-on' : '') . '" data-f="' . esc($c['id']) . '">' . esc($c['short']) . ' <b>' . $n . '</b></button>';
  }
  $cards = '';
  foreach ($data['products'] as $p) $cards .= productCard($p, findCat($data, $p['category'] ?? null), $data);
  $body = "\n" . '<section class="phero">'
    . "\n" . '  <div class="wrap">'
    . "\n" . '    <nav class="crumbs"><a href="/">الرئيسية</a>' . icon('chev') . '<span>المنتجات</span></nav>'
    . "\n" . '    <h1>منتجاتنا</h1>'
    . "\n" . '    <p>كل الأسعار نهائية وتشمل التركيب داخل الرياض، إلا إذا انذكر غير كذا.</p>'
    . "\n" . '  </div>'
    . "\n" . '  ' . wave()
    . "\n" . '</section>'
    . "\n" . '<section class="sec sec--tight">'
    . "\n" . '  <div class="wrap">'
    . "\n" . '    <div class="filter-bar">'
    . "\n" . '      <div class="filters" id="filters">'
    . "\n" . '        ' . $chips
    . "\n" . '      </div>'
    . "\n" . '      <div class="sortwrap">'
    . "\n" . '        <label>ترتيب:'
    . "\n" . '          <select id="sortSel">'
    . "\n" . '            <option value="featured">المميزة أولاً</option>'
    . "\n" . '            <option value="price-asc">السعر: من الأقل</option>'
    . "\n" . '            <option value="price-desc">السعر: من الأعلى</option>'
    . "\n" . '            <option value="name">الاسم</option>'
    . "\n" . '          </select>'
    . "\n" . '        </label>'
    . "\n" . '      </div>'
    . "\n" . '    </div>'
    . "\n" . '    <div class="grid grid--3" id="pgrid">'
    . "\n      " . $cards
    . "\n" . '    </div>'
    . "\n" . '    <p class="empty" id="pempty" hidden>ما فيه منتجات بهالقسم الحين.</p>'
    . "\n" . '  </div>'
    . "\n" . '</section>'
    . "\n" . '<section class="cta"><div class="wrap cta-in">'
    . "\n" . '  <div><h2>ما لقيت اللي تدور عليه؟</h2><p>عندنا أصناف ثانية بالمعرض — أرسل لنا صورة أو مواصفات الجهاز ونوفّره لك.</p></div>'
    . "\n" . '  <div class="cta-btns"><a class="btn btn--gold btn--lg" href="' . waLink($s, 'السلام عليكم، أدور على جهاز بمواصفات معينة — ' . $s['nameFull']) . '" target="_blank" rel="noopener">' . icon('wa') . ' أرسل المواصفات</a></div>'
    . "\n" . '</div></section>';
  return render_layout(['title' => 'المنتجات | ' . $s['nameFull'], 'desc' => 'أجهزة تحلية مياه منزلية، محطات مقاهي ومطاعم، برادات، وقطع غيار أصلية في الرياض مع تركيب مجاني وضمان سنتين.', 'body' => $body, 'active' => 'products', 'data' => $data]);
}

function pageProduct($data, $p) {
  $s = $data['settings'];
  $cat = findCat($data, $p['category'] ?? null);
  $related = array_slice(array_values(array_filter($data['products'], fn($x) => ($x['category'] ?? null) === ($p['category'] ?? null) && ($x['id'] ?? null) !== ($p['id'] ?? null))), 0, 3);
  $jsonLd = jsJSON([
    '@context' => 'https://schema.org', '@type' => 'Product', 'name' => $p['name'], 'description' => $p['desc'],
    'offers' => ['@type' => 'Offer', 'price' => $p['price'], 'priceCurrency' => 'SAR',
      'availability' => (($p['stock'] ?? null) === 'متوفر') ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder'],
  ]);
  $priceHTML = (float)($p['price'] ?? 0) > 0
    ? (jT($p['oldPrice'] ?? null) && $p['oldPrice'] > $p['price'] ? '<s>' . money($p['oldPrice']) . ' <span class="cur" role="img" aria-label="ريال"></span></s>' : '')
      . '<b>' . money($p['price']) . '</b><span class="cur" role="img" aria-label="ريال"></span>'
    : '<b>السعر بالتواصل</b>';
  $taxNoteI = jT($s['taxNote'] ?? null) ? '<i>' . esc($s['taxNote']) . '</i>' : '';
  $flag = jT($p['badge'] ?? null) ? '<span class="flag">' . esc($p['badge']) . '</span>' : '';
  $ds1 = jT($p['stages'] ?? null) ? '<div><span>عدد المراحل</span><b>' . $p['stages'] . '</b></div>' : '';
  $ds2 = (jT($p['output'] ?? null) && $p['output'] !== '—') ? '<div><span>الإنتاجية</span><b>' . esc($p['output']) . '</b></div>' : '';
  $ds3 = jT($p['origin'] ?? null) ? '<div><span>المنشأ</span><b>' . esc($p['origin']) . '</b></div>' : '';
  $ds4 = (jT($p['warranty'] ?? null) && $p['warranty'] !== '—') ? '<div><span>الضمان</span><b>' . esc($p['warranty']) . '</b></div>' : '';
  $feats = '';
  foreach ((isset($p['features']) && is_array($p['features'])) ? $p['features'] : [] as $f) $feats .= '<li>' . icon('check') . ' ' . esc($f) . '</li>';
  $waHref = waLink($s, 'السلام عليكم، أبغى أطلب: ' . $p['name'] . ((float)($p['price'] ?? 0) > 0 ? ' (' . money($p['price']) . ' ريال)' : '') . ' — ' . $s['nameFull']);
  $addBtn = (float)($p['price'] ?? 0) > 0 ? '<button class="btn btn--gold btn--lg" data-add="' . esc($p['id']) . '">' . icon('cart') . ' أضف لسلة الطلب</button>' : '';
  $relInner = '';
  if ($related) {
    $relCards = '';
    foreach ($related as $r) $relCards .= productCard($r, $cat, $data);
    $relInner = '<section class="sec sec--alt"><div class="wrap">
  ' . sectionHead('يمكن يعجبك بعد', 'أصناف تشبهه من نفس القسم', '')
      . "\n  " . '<div class="grid grid--3">' . $relCards . '</div>'
      . "\n" . '</div></section>';
  }
  $body = "\n" . '<section class="phero phero--soft">'
    . "\n" . '  <div class="wrap">'
    . "\n" . '    <nav class="crumbs"><a href="/">الرئيسية</a>' . icon('chev') . '<a href="/products">المنتجات</a>' . icon('chev') . '<a href="/products?cat=' . esc($cat['id']) . '">' . esc($cat['name']) . '</a>' . icon('chev') . '<span>' . esc($p['name']) . '</span></nav>'
    . "\n" . '  </div>'
    . "\n" . '</section>'
    . "\n" . '<section class="sec sec--tight">'
    . "\n" . '  <div class="wrap pdetail">'
    . "\n" . '    <div class="pd-media reveal">'
    . "\n      " . productGallery($p)
    . "\n      " . $flag
    . "\n" . '    </div>'
    . "\n" . '    <div class="pd-info">'
    . "\n" . '      <span class="pcard-cat">' . icon($cat['icon']) . ' ' . esc($cat['name']) . '</span>'
    . "\n" . '      <h1>' . esc($p['name']) . '</h1>'
    . "\n" . '      <p class="pd-desc">' . esc($p['desc']) . '</p>'
    . "\n" . '      <div class="pd-price">'
    . "\n" . '        ' . $priceHTML
    . "\n" . '        ' . $taxNoteI
    . "\n" . '      </div>'
    . "\n" . '      <div class="pd-specs">'
    . "\n" . '        ' . $ds1
    . "\n" . '        ' . $ds2
    . "\n" . '        ' . $ds3
    . "\n" . '        ' . $ds4
    . "\n" . '        ' . '<div><span>التركيب</span><b>' . (jT($p['installIncluded'] ?? null) ? 'مجاني' : 'غير مشمول') . '</b></div>'
    . "\n" . '        ' . '<div><span>التوفر</span><b>' . esc(jT($p['stock'] ?? null) ? $p['stock'] : 'متوفر') . '</b></div>'
    . "\n" . '      </div>'
    . "\n" . '      <ul class="pd-feats">' . $feats . '</ul>'
    . "\n" . '      <div class="pd-acts">'
    . "\n" . '        ' . $addBtn
    . "\n" . '        ' . '<a class="btn btn--wa btn--lg" target="_blank" rel="noopener" href="' . $waHref . '">' . icon('wa') . ' اطلب عبر واتساب</a>'
    . "\n" . '        ' . '<a class="btn btn--ghost btn--lg" href="tel:' . tel($s['phone']) . '">' . icon('phone') . ' اتصل</a>'
    . "\n" . '      </div>'
    . "\n" . '      <div class="pd-trust">'
    . "\n" . '        <span>توصيل وتركيب</span><span>ضمان ' . esc(jT($p['warranty'] ?? null) ? $p['warranty'] : '—') . '</span><span>فحص أملاح مجاني</span>'
    . "\n" . '      </div>'
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '</section>'
    . "\n" . $relInner;
  return render_layout(['title' => $p['name'] . ' | ' . $s['nameFull'], 'desc' => mb_substr($p['desc'], 0, 155), 'body' => $body, 'active' => 'products', 'data' => $data, 'jsonLd' => $jsonLd]);
}

function pageServices($data) {
  $s = $data['settings'];
  $items = '';
  foreach ($data['services'] as $i => $sv) {
    $bul = '';
    foreach ($sv['bullets'] as $b) $bul .= '<li>' . esc($b) . '</li>';
    $items .= '<article class="srv reveal ' . ($i % 2 ? 'srv--rev' : '') . '">'
      . "\n      " . '<div class="srv-ic">' . icon($sv['icon']) . '</div>'
      . "\n      " . '<div class="srv-body">'
      . "\n" . '        <h2>' . esc($sv['title']) . '</h2>'
      . "\n" . '        <p>' . esc($sv['desc']) . '</p>'
      . "\n" . '        <ul>' . $bul . '</ul>'
      . "\n" . '        <a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="' . waLink($s, 'السلام عليكم، أبغى خدمة: ' . $sv['title'] . ' — ' . $s['nameFull']) . '">' . icon('wa') . ' اطلب الخدمة</a>'
      . "\n" . '      </div>'
      . "\n" . '    </article>';
  }
  $body = "\n" . '<section class="phero"><div class="wrap">'
    . "\n" . '  <nav class="crumbs"><a href="/">الرئيسية</a>' . icon('chev') . '<span>الخدمات</span></nav>'
    . "\n" . '  <h1>خدماتنا</h1>'
    . "\n" . '  <p>بيع وتركيب وصيانة أجهزة تحلية المياه المنزلية والبرادات، ومحطات التحلية للمقاهي والمطاعم.</p>'
    . "\n" . '</div>' . wave() . '</section>'
    . "\n" . '<section class="sec sec--tight"><div class="wrap">'
    . "\n" . '  <div class="srv-list">'
    . "\n    " . $items
    . "\n" . '  </div>'
    . "\n" . '</div></section>';
  return render_layout(['title' => 'الخدمات | ' . $s['nameFull'], 'desc' => 'تركيب وصيانة أجهزة تحلية المياه، فحص المياه وقياس الأملاح، تجهيز المقاهي والمطاعم، تنقية الخزانات، وفك ونقل الأجهزة في الرياض.', 'body' => $body, 'active' => 'services', 'data' => $data]);
}

function pageAbout($data) {
  $s = $data['settings'];
  $estBlock = '';
  if (jT($s['officialName'] ?? null)) {
    $r2 = jT($s['ownerName'] ?? null) ? '<li><span>الإدارة</span><b>' . esc($s['ownerName']) . '</b></li>' : '';
    $r3 = (jT($s['crNumber'] ?? null) && $s['crNumber'] !== '—') ? '<li><span>السجل التجاري</span><b>' . esc($s['crNumber']) . '</b></li>' : '';
    $r4 = jT($s['unifiedNumber'] ?? null) ? '<li><span>الرقم الموحد</span><b>' . esc($s['unifiedNumber']) . '</b></li>' : '';
    $estBlock = '<div class="est-card">'
      . "\n      " . '<h3>بطاقة المنشأة</h3>'
      . "\n      " . '<ul>'
      . "\n        " . '<li><span>الاسم الرسمي</span><b>' . esc($s['officialName']) . '</b></li>'
      . "\n        " . $r2
      . "\n        " . $r3
      . "\n        " . $r4
      . "\n      </ul>"
      . "\n    </div>";
  }
  $vals = '';
  foreach ([['نقيس قبل ما نبيع', 'فحص أملاح مجاني لكل عميل قبل التوصية'], ['موعد يعني موعد', 'نلتزم بالموعد، ونتصل عليك قبل لا نوصل'], ['قطع أصلية فقط', 'ما نركّب شمعة مجهولة المصدر أبداً'], ['نتابع بعد البيع', 'تذكير واتساب قبل موعد الصيانة']] as $v) {
    $vals .= '<div class="value reveal"><h3>' . esc($v[0]) . '</h3><p>' . esc($v[1]) . '</p></div>';
  }
  $body = "\n" . '<section class="phero"><div class="wrap">'
    . "\n" . '  <nav class="crumbs"><a href="/">الرئيسية</a>' . icon('chev') . '<span>من نحن</span></nav>'
    . "\n" . '  <h1>' . esc($s['nameFull']) . '</h1>'
    . "\n" . '  <p>' . esc($s['tagline']) . '</p>'
    . "\n" . '</div>' . wave() . '</section>'
    . "\n" . '<section class="sec sec--tight"><div class="wrap wrap--narrow">'
    . "\n" . '  <div class="prose reveal">'
    . "\n" . '    <p class="big">إحنا محل متخصصين في <b>بيع وتركيب وصيانة أجهزة تحلية المياه المنزلية والبرادات</b>، ومحطات التحلية الخاصة بالمقاهي والمطاعم.</p>'
    . "\n" . '    <p>انطلقنا من محل واحد بالرياض، ومن وعد واحد ما تغيّر: <b>الجهاز المناسب لموية بيتك</b> — مو الأغلى ولا الأرخص — وتركيب يضبط من أول مرة، وبعد البيع نحن معك بالصيانة والتذكير تلقائيًا.</p>'
    . "\n" . '    <p>نخدم ' . esc($s['coverage']) . ' بفريق مجهز بسيارات خدمة وعدة قياس كاملة — ولعملاء المنشآت عقود صيانة دورية تحفظ لهم استمرارية الإنتاج طول السنة.</p>'
    . "\n    " . $estBlock
    . "\n" . '  </div>'
    . "\n" . '  <div class="values">'
    . "\n    " . $vals
    . "\n" . '  </div>'
    . "\n" . '</div></section>';
  return render_layout(['title' => 'من نحن | ' . $s['nameFull'], 'desc' => $s['nameFull'] . ' — محل متخصص في بيع وتركيب وصيانة أجهزة تحلية المياه المنزلية والبرادات ومحطات المقاهي والمطاعم في الرياض.', 'body' => $body, 'active' => 'about', 'data' => $data, 'needArt' => false]);
}

function pageContact($data) {
  $s = $data['settings'];
  $st = openState($s);
  $emailBox = jT($s['email'] ?? null) ? '<a class="cbox" href="mailto:' . esc($s['email']) . '"><span>' . icon('mail') . '</span><div><b>' . esc($s['email']) . '</b><i>للعروض وعقود الشركات</i></div></a>' : '';
  $noteLine = jT($s['addressNote'] ?? null) ? '<em>' . esc($s['addressNote']) . '</em>' : '';
  $detail = jT($st['detail']) ? '· ' . esc($st['detail']) : '';
  $q = jsEnc(jT($s['mapCoords'] ?? null) ? $s['mapCoords'] : ($s['name'] . ' ' . preg_replace('/[—–،,]/u', ' ', (string)($s['address'] ?? ''))));
  $z = jT($s['mapCoords'] ?? null) ? 17 : 16;
  $body = "\n" . '<section class="phero"><div class="wrap">'
    . "\n" . '  <nav class="crumbs"><a href="/">الرئيسية</a>' . icon('chev') . '<span>تواصل معنا</span></nav>'
    . "\n" . '  <h1>تواصل معنا</h1>'
    . "\n" . '  <p class="' . ($st['open'] ? 'is-open' : 'is-closed') . '"><i class="dot"></i> ' . esc($st['label']) . ' ' . $detail . '</p>'
    . "\n" . '</div>' . wave() . '</section>'
    . "\n" . '<section class="sec sec--tight"><div class="wrap contact-grid">'
    . "\n" . '  <div class="cinfo reveal">'
    . "\n" . '    <a class="cbox cbox--wa" href="' . waLink($s) . '" target="_blank" rel="noopener"><span>' . icon('wa') . '</span><div><b>واتساب</b><i>أسرع طريقة للطلب والاستفسار</i></div></a>'
    . "\n" . '    <a class="cbox" href="tel:' . tel($s['phone']) . '"><span>' . icon('phone') . '</span><div><b>' . esc($s['phoneDisplay']) . '</b><i>اتصال مباشر</i></div></a>'
    . "\n    " . $emailBox
    . "\n" . '    <a class="cbox" href="' . esc($s['maps']) . '" target="_blank" rel="noopener"><span>' . icon('pin') . '</span><div><b>' . esc($s['address']) . '</b><i>' . esc(jT($s['addressNote'] ?? null) ? $s['addressNote'] : '') . '</i></div></a>'
    . "\n" . '  </div>'
    . "\n" . '  <form class="cform reveal" id="quoteForm">'
    . "\n" . '    <h2>أرسل طلبك أو استفسارك</h2>'
    . "\n" . '    <div class="frow">'
    . "\n" . '      <label>الاسم<input name="name" required placeholder="اسمك"></label>'
    . "\n" . '      <label>الجوال<input name="phone" required placeholder="05xxxxxxxx" inputmode="tel"></label>'
    . "\n" . '    </div>'
    . "\n" . '    <label>نوع الطلب'
    . "\n" . '      <select name="type">'
    . "\n" . '        <option>شراء جهاز تحلية منزلي</option>'
    . "\n" . '        <option>محطة لمقهى أو مطعم</option>'
    . "\n" . '        <option>برادة مياه</option>'
    . "\n" . '        <option>قطع غيار / شمعات</option>'
    . "\n" . '        <option>صيانة أو إصلاح</option>'
    . "\n" . '        <option>باقة صيانة سنوية</option>'
    . "\n" . '        <option>فحص مياه مجاني</option>'
    . "\n" . '        <option>محطة مركزية / فيلا</option>'
    . "\n" . '      </select>'
    . "\n" . '    </label>'
    . "\n" . '    <label>الحي<input name="area" placeholder="مثال: حي السويدي"></label>'
    . "\n" . '    <label>التفاصيل<textarea name="msg" rows="4" placeholder="اكتب تفاصيل طلبك…"></textarea></label>'
    . "\n" . '    <button class="btn btn--wa btn--lg btn--block" type="submit">' . icon('wa') . ' أرسل عبر واتساب</button>'
    . "\n" . '  </form>'
    . "\n" . '</div></section>'
    . "\n" . '<section class="sec sec--tight"><div class="wrap">'
    . "\n" . '  <div class="locband reveal">'
    . "\n" . '    <span class="loc-ic">' . icon('pin') . '</span>'
    . "\n" . '    <div class="loc-tx">'
    . "\n" . '      <b>معرضنا بالرياض — السويدي الغربي</b>'
    . "\n" . '      <i>' . esc($s['address']) . '</i>'
    . "\n      " . $noteLine
    . "\n" . '    </div>'
    . "\n" . '    <div class="loc-acts">'
    . "\n" . '      <a class="btn btn--gold btn--lg" href="' . esc($s['maps']) . '" target="_blank" rel="noopener">' . icon('pin') . ' افتح الاتجاهات</a>'
    . "\n" . '      <a class="btn btn--glass btn--lg" href="tel:' . tel($s['phone']) . '">' . icon('phone') . ' اتصال</a>'
    . "\n" . '    </div>'
    . "\n" . '  </div>'
    . "\n" . '  <div class="gmap reveal" id="gmap">'
    . "\n" . '    <iframe title="خريطة موقع ' . esc($s['name']) . ' — الرياض" src="https://maps.google.com/maps?q=' . $q . '&z=' . $z . '&hl=ar&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>'
    . "\n" . '    <button class="gmap-ov" id="gmapOn" type="button"><span>' . icon('pin') . ' تفاعل مع الخريطة</span></button>'
    . "\n" . '    <button class="gmap-exit" id="gmapOff" type="button" hidden>إنهاء</button>'
    . "\n" . '  </div>'
    . "\n" . '</div></section>';
  return render_layout(['title' => 'تواصل معنا | ' . $s['nameFull'], 'desc' => 'تواصل مع ' . $s['nameFull'] . ' في الرياض — ' . $s['phoneDisplay'] . '. ' . $s['address'] . '. واتساب، اتصال، أو زيارة المعرض.', 'body' => $body, 'active' => 'contact', 'data' => $data, 'needArt' => false]);
}

function pageNotFound($data) {
  $s = $data['settings'];
  $body = '<section class="sec sec--err"><div class="wrap center">'
    . "\n" . '    <div class="err-code">404</div>'
    . "\n" . '    <h1>هذي الصفحة ما لها وجود</h1>'
    . "\n" . '    <p>يمكن الرابط قديم — بس المويه العذبة موجودة 😉</p>'
    . "\n" . '    <div class="hero-cta center"><a class="btn btn--gold btn--lg" href="/">الصفحة الرئيسية</a><a class="btn btn--ghost btn--lg" href="/products">المنتجات</a></div>'
    . "\n" . '  </div></section>';
  return render_layout(['title' => 'الصفحة غير موجودة | ' . $s['nameFull'], 'desc' => '404', 'body' => $body, 'active' => '', 'data' => $data, 'needArt' => false]);
}
