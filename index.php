<?php
/* =========================================================
   الفرات الحلو لتحلية المياه — الخادم (PHP)
   نفس مسارات وعقود server.js بالضبط — Front Controller واحد
   ========================================================= */
require_once __DIR__ . '/app/store.php';
require_once __DIR__ . '/app/auth.php';
require_once __DIR__ . '/app/render.php';
require_once __DIR__ . '/app/upload.php';
require_once __DIR__ . '/app/export.php';
require_once __DIR__ . '/app/qr.php';
require_once __DIR__ . '/app/card.php';

/* ملف ثابت موجود؟ (لخادم php -S التطويري) — Apache/LiteSpeed يخدمه مباشرة قبل الـrewrite */
if (PHP_SAPI === 'cli-server') {
  $p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
  $file = __DIR__ . $p;
  /* خادم التطوير: التمرير لملفات الواجهة فقط — data/ وapp/ تُرفض كما في الإنتاج */
  if ($p !== '/' && is_file($file) && strpos(realpath($file), realpath(__DIR__)) === 0) {
    if (strpos($p, '/assets/') === 0) return false;
    if ($p === '/sw.js' || $p === '/manifest.webmanifest') return false;
    if (preg_match('#^/data/admin/[\w.-]+\.html$#', $p)) { readfile($file); exit; }
    http_response_code(403); header('Content-Type: text/plain; charset=utf-8'); echo '403 — forbidden'; exit;
  }
}

header_remove('X-Powered-By');
@ini_set('display_errors', '0');
@ini_set('log_errors', '1');

$METHOD = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$PATH = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
$Q = $_GET;

/* ---------- رؤوس الأمان (لكل الاستجابات) ---------- */
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
$xfp0 = trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]);
if ($xfp0 === 'https') header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

/* ---------- أدوات HTTP مطابقة لـ express ---------- */
function fh_origin() {
  $proto = trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]) ?: 'http';
  $host = trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ''))[0]) ?: trim(explode(',', (string)($_SERVER['HTTP_HOST'] ?? ''))[0]);
  return [$proto, $host];
}
function fh_json($v, $status = 200) {
  if ($status !== 200) http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo jsJSON($v);
  exit;
}
function fh_absMeta($html) {
  [$proto, $host] = fh_origin();
  if (!$host) return $html;
  $origin = $proto . '://' . $host;
  $url = $origin . preg_replace('/\?.*$/', '', $_SERVER['REQUEST_URI'] ?? '/');
  $html = str_replace('content="/assets/', 'content="' . $origin . '/assets/', $html);
  if (strpos($html, 'rel="canonical"') === false) {
    $html = str_replace('</head>', '<link rel="canonical" href="' . $url . "\">\n" . '<meta property="og:url" content="' . $url . "\">\n</head>", $html);
  }
  return $html;
}
function fh_sendPage($html) {
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: no-cache');
  echo fh_absMeta($html);
  exit;
}
function fh_readBody() {
  $ct = (string)($_SERVER['CONTENT_TYPE'] ?? '');
  if (stripos($ct, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 4 * 1024 * 1024) fh_json(['error' => 'request entity too large'], 413);
    $v = json_decode($raw);
    return ($v === null && trim($raw) !== '') ? null : fh_norm($v);
  }
  return fh_norm($_POST ?: null);
}

fh_data_dir();
fh_maybeBuildArt();
$D = fh_getData();

/* ---------- عدّاد الزيارات (مثل stats middleware) — GET خارج /assets و/api و/admin و/sw.js ---------- */
if ($METHOD === 'GET' && strpos($PATH, '/assets') !== 0 && strpos($PATH, '/api') !== 0 && strpos($PATH, '/admin') !== 0 && strpos($PATH, '/sw.js') !== 0) {
  $STATS_PATH = FH_DATA . '/stats.json';
  $st = fh_fromJson(is_file($STATS_PATH) ? (string)file_get_contents($STATS_PATH) : '', ['pages' => []]);
  if (!is_array($st) || !isset($st['pages'])) $st = ['pages' => []];
  $day = gmdate('Y-m-d');
  $key = ($PATH === '/') ? '/' : preg_replace('/\/+$/', '', $PATH);
  if (!isset($st['pages'][$key]) || !is_array($st['pages'][$key])) $st['pages'][$key] = ['total' => 0, 'days' => []];
  $st['pages'][$key]['total'] = (int)$st['pages'][$key]['total'] + 1;
  $st['pages'][$key]['days'][$day] = (int)($st['pages'][$key]['days'][$day] ?? 0) + 1;
  $tmp = $STATS_PATH . '.tmp';
  file_put_contents($tmp, jsJSON($st));
  @rename($tmp, $STATS_PATH);
}

/* ---------- PWA ---------- */
if ($PATH === '/manifest.webmanifest' && $METHOD === 'GET') {
  $s = $D['settings'] ?? [];
  fh_json([
    'name' => $s['nameFull'] ?? null,
    'short_name' => $s['name'] ?? null,
    'description' => mb_substr((string)($s['heroText'] ?? ''), 0, 120),
    'lang' => 'ar', 'dir' => 'rtl', 'scope' => '/', 'start_url' => '/', 'display' => 'standalone',
    'background_color' => '#F6FBFD', 'theme_color' => '#073B57',
    'icons' => [
      ['src' => '/assets/logo/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
      ['src' => '/assets/logo/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any maskable'],
    ],
  ]);
}
if ($PATH === '/sw.js' && $METHOD === 'GET') {
  header('Content-Type: application/javascript; charset=utf-8');
  echo <<<JS

const C='furat-v41';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET') return;
  if(u.origin!==self.location.origin) return;
  if(u.pathname.startsWith('/admin')||u.pathname.startsWith('/api')) return;
  if(u.pathname.startsWith('/assets')){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const c=n.clone();caches.open(C).then(x=>x.put(e.request,c));return n}).catch(()=>caches.match('/assets/offline.html'))));
    return;
  }
  e.respondWith(fetch(e.request).catch(()=>caches.match('/assets/offline.html')));
});
JS;
  exit;
}

/* ---------- SEO ---------- */
if ($PATH === '/robots.txt' && $METHOD === 'GET') {
  $host = trim(explode(',', (string)($_SERVER['HTTP_HOST'] ?? ''))[0]);
  $proto = ($_SERVER['HTTPS'] ?? '') === 'on' || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443 ? 'https' : 'http';
  if ($xfp0 === 'https') $proto = 'https';
  header('Content-Type: text/plain; charset=utf-8');
  echo "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nSitemap: {$proto}://{$host}/sitemap.xml\n";
  exit;
}
if ($PATH === '/sitemap.xml' && $METHOD === 'GET') {
  [$proto, $host] = fh_origin();
  $base = $proto . '://' . $host;
  $urls = array_merge(['/', '/products', '/services', '/about', '/contact'], array_map(fn($p) => '/product/' . $p['id'], $D['products'] ?? []));
  $lines = [];
  foreach ($urls as $u) $lines[] = '  <url><loc>' . $base . $u . '</loc><changefreq>weekly</changefreq><priority>' . ($u === '/' ? '1.0' : '0.8') . '</priority></url>';
  header('Content-Type: application/xml; charset=utf-8');
  echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" . implode("\n", $lines) . "\n</urlset>";
  exit;
}

/* ---------- حالة البناء ---------- */
if ($PATH === '/api/build' && $METHOD === 'GET') {
  header('Cache-Control: no-store');
  fh_json(['admin' => 27]);
}

/* ---------- تحليلات اللوحة ---------- */
if ($PATH === '/api/admin/stats' && $METHOD === 'GET') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  $STATS_PATH = FH_DATA . '/stats.json';
  $st = fh_fromJson(is_file($STATS_PATH) ? (string)file_get_contents($STATS_PATH) : '', ['pages' => []]);
  $days = [];
  $total = 0;
  foreach (($st['pages'] ?? []) as $p) {
    foreach (($p['days'] ?? []) as $d => $n) $days[$d] = ($days[$d] ?? 0) + (int)$n;
    $total += (int)$p['total'];
  }
  $topRows = [];
  $i = 0;
  $tmp = [];
  foreach (($st['pages'] ?? []) as $k => $p) $tmp[] = ['path' => $k, 'total' => (int)$p['total'], 'i' => $i++];
  usort($tmp, function ($a, $b) { return $b['total'] !== $a['total'] ? $b['total'] - $a['total'] : $a['i'] - $b['i']; });
  foreach (array_slice($tmp, 0, 12) as $r) $topRows[] = ['path' => $r['path'], 'total' => $r['total']];
  krsort($days);
  $byDay = array_slice($days, 0, 14, true);
  $byDayArr = [];
  foreach ($byDay as $d => $n) $byDayArr[] = [$d, (int)$n];
  fh_json(['total' => $total, 'byDay' => $byDayArr, 'top' => $topRows]);
}

/* ---------- الصفحات ---------- */
if ($METHOD === 'GET') {
  if ($PATH === '/') fh_sendPage(pageHome($D));
  if ($PATH === '/products') fh_sendPage(pageProducts($D, $Q));
  if (preg_match('#^/product/([^/]+)$#', $PATH, $m)) {
    $id = $m[1];
    $p = null;
    foreach ($D['products'] as $pp) { if (($pp['id'] ?? null) === $id) { $p = $pp; break; } }
    if (!$p) { http_response_code(404); header('Content-Type: text/html; charset=utf-8'); echo pageNotFound($D); exit; }
    fh_sendPage(pageProduct($D, $p));
  }
  if ($PATH === '/services') fh_sendPage(pageServices($D));
  /* صفحات حُذفت في التنظيف النهائي — تحويل دائم للرئيسية */
  if ($PATH === '/packages' || $PATH === '/tools' || $PATH === '/blog' || preg_match('#^/blog/[^/]+$#', $PATH)) { http_response_code(301); header('Location: /'); header('Content-Type: text/plain; charset=utf-8'); echo 'Moved Permanently. Redirecting to /'; exit; }
  if ($PATH === '/about') fh_sendPage(pageAbout($D));
  if ($PATH === '/contact') fh_sendPage(pageContact($D));
}

/* ---------- API عام للقراءة ---------- */
if ($PATH === '/api/data' && $METHOD === 'GET') { $pub = $D; unset($pub['settings']['loginMode']); fh_json($pub); }

/* ---------- لوحة التحكم ---------- */
if ($PATH === '/admin' || $PATH === '/admin/') {
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: no-store, must-revalidate');
  readfile(FH_DATA . '/admin/index.html');
  exit;
}
if ($PATH === '/admin/login' && $METHOD === 'GET') {
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: no-store, must-revalidate');
  readfile(FH_DATA . '/admin/login.html');
  exit;
}
if ($PATH === '/api/login/mode' && $METHOD === 'GET') {
  fh_init();
  fh_json(['mode' => fh_loginMode(), 'hasFace' => fh_hasFace()]);
}
if ($PATH === '/admin/face-grid' && $METHOD === 'GET') {
  fh_init();
  if (fh_loginMode() === 'pin' || !fh_hasFace()) { fh_json(['error' => 'n/a'], 404); }
  $pos = random_int(0, 8);
  $cells = [];
  for ($i = 0; $i < 9; $i++) $cells[] = ($i === $pos) ? fh_faceAvatarDataUri() : fh_faceDecoDataUri($i, $pos);
  $tok = fh_faceIssue($pos);
  @file_put_contents(FH_DATA . '/face-chal', hash('sha256', $tok)); /* كل شبكة تلغي سابقتها: تخمين واحد لكل خلط */
  fh_json(['cells' => $cells, 't' => $tok]);
}
if ($PATH === '/admin/login' && $METHOD === 'POST') {
  $ip = fh_clientIp();
  $now = fh_ms();
  $n = fh_throttleCount($ip);
  $cap = 8;
  if (preg_match('/"face"/', (string)file_get_contents('php://input') ?: '')) $cap = 4; /* وضع الوجه: 4 محاولات لا 8 */
  if ($n >= $cap) {
    header('Retry-After: 600');
    fh_json(['ok' => false, 'error' => 'محاولات كثيرة خاطئة — انتظر 10 دقائق ثم أعد المحاولة'], 429);
  }
  $b = fh_readBody() ?: [];
  $pin = trim((string)($b['pin'] ?? ''));
  fh_init();
  $mode = fh_loginMode();
  $okPin = $pin !== '' && fh_hashPin($pin) === fh_pinHash();
  $okFace = false;
  if ($mode !== 'pin') {
    $fc = is_array($b['face'] ?? null) ? $b['face'] : [];
    $okFace = fh_faceVerify((string)($fc['t'] ?? ''), (int)($fc['g'] ?? -1));
  }
  if ($mode !== 'pin') {
    $okFace = $okFace && hash_equals((string)@file_get_contents(FH_DATA . '/face-chal'), hash('sha256', (string)($fc['t'] ?? '')));
    @unlink(FH_DATA . '/face-chal'); /* استُخدم — الشبكة تحتاج خلطًا جديدًا */
  }
  $grant = ($mode === 'pin' && $okPin) || ($mode === 'face' && $okFace) || ($mode === 'both' && $okPin && $okFace);
  if ($grant) {
    fh_throttleClear($ip);
    fh_json(['ok' => true, 'token' => fh_newToken()]);
  }
  $cnt = fh_throttleBump($ip);
  error_log('[auth] محاولة دخول فاشلة من ' . $ip . ' عدد: ' . $cnt);
  fh_json(['ok' => false, 'error' => 'bad-pin'], 401);
}
if ($PATH === '/admin/logout') {
  setcookie(FH_COOKIE, '', [ 'expires' => time() - 3600, 'path' => '/', 'samesite' => 'Lax' ]);
  fh_json(['ok' => true]);
}

/* ---------- نقاط اللوحة المحمية ---------- */
if ($PATH === '/api/admin/meta' && $METHOD === 'GET') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  fh_json(['defaultPin' => fh_isDefaultPin(), 'loginMode' => fh_loginMode(), 'hasFace' => fh_hasFace()]);
}
if ($PATH === '/api/admin/backup' && $METHOD === 'GET') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  fh_init();
  global $FH_STORE;
  $n = 0;
  foreach (scandir(FH_BK_DIR) ?: [] as $f) if (substr($f, -5) === '.json') $n++;
  $last = fh_lastSnap();
  $mode = $FH_STORE['mode'] === 'mysql' ? 'mysql' : 'file';
  fh_json(['active' => true, 'local' => $mode === 'file', 'mysql' => $mode === 'mysql', 'sqlite' => $mode === 'sqlite', 'mode' => $mode, 'snapshots' => $n, 'last' => $last ? fh_isoMs($last) : null]);
}
if ($PATH === '/api/admin/backup' && $METHOD === 'POST') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  fh_snapshot();
  fh_json(['ok' => true, 'last' => fh_nowIso()]);
}
if ($PATH === '/api/admin/backup/download' && $METHOD === 'GET') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  header('Content-Disposition: attachment; filename="furat-backup-' . gmdate('Y-m-d') . '.json"');
  fh_json(['exportedAt' => fh_nowIso(), 'data' => fh_getData(), 'customers' => fh_getCustomers()]);
}
if ($PATH === '/api/admin/restore' && $METHOD === 'POST') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  $b = fh_readBody() ?: [];
  try {
    if (is_array($b) && !empty($b['data']) && is_array($b['data']) && isset($b['data']['settings']) && isset($b['data']['products']) && is_array($b['data']['products'])) {
      if (is_file(FH_DATA_PATH)) @copy(FH_DATA_PATH, FH_DATA_PATH . '.bak');
      fh_saveData($b['data']);
      fh_snapshot();
    }
    if (!empty($b['customers']) && is_array($b['customers']) && isset($b['customers']['customers']) && is_array($b['customers']['customers'])) {
      if (is_file(FH_CUST_PATH)) @copy(FH_CUST_PATH, FH_CUST_PATH . '.bak');
      fh_saveCustomers($b['customers']);
      fh_snapshot();
    }
    fh_json(['ok' => true]);
  } catch (Throwable $e) { fh_json(['ok' => false, 'error' => $e->getMessage()], 500); }
}
if ($PATH === '/api/admin/customers' && $METHOD === 'GET') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  fh_json(fh_getCustomers());
}
if ($PATH === '/api/admin/customers' && $METHOD === 'POST') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  $b = fh_readBody() ?: [];
  if (!is_array($b) || !isset($b['customers']) || !is_array($b['customers'])) fh_json(['error' => 'bad payload'], 400);
  $cycles = ['pre' => 6, 'post' => 12, 'membrane' => 24];
  foreach (asArr($b['cycles'] ?? []) as $k => $v) $cycles[$k] = $v;
  try {
    fh_saveCustomers(['cycles' => $cycles, 'customers' => $b['customers']]);
    fh_snapshot();
    fh_json(['ok' => true, 'saved' => fh_nowIso()]);
  } catch (Throwable $e) { fh_json(['error' => $e->getMessage()], 500); }
}
if ($PATH === '/api/admin/face' && $METHOD === 'POST') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  $f = $_FILES['img'] ?? null;
  if (!$f || (int)($f['error'] ?? 1) !== UPLOAD_ERR_OK || (int)$f['size'] > 8 * 1024 * 1024 || !preg_match('/^image\/(jpeg|png|webp)$/', (string)($f['type'] ?? '')))
    fh_json(['ok' => false, 'error' => 'صورة غير صالحة (jpeg/png/webp حتى 8MB)'], 400);
  $img = fh_imageLoad((string)$f['tmp_name'], (string)$f['type']);
  if (!$img) fh_json(['ok' => false, 'error' => 'تعذر قراءة الصورة'], 400);
  $w0 = imagesx($img); $h0 = imagesy($img); $side = min($w0, $h0);
  $out = imagecreatetruecolor(224, 224);
  imagecopyresampled($out, $img, 0, 0, intdiv($w0 - $side, 2), intdiv($h0 - $side, 2), 224, 224, $side, $side);
  @mkdir(fh_facesDir(), 0750, true);
  imagejpeg($out, fh_faceFile(), 92);
  imagedestroy($img); imagedestroy($out);
  @unlink(fh_facesDir() . '/owner-avatar.png');
  fh_json(['ok' => true]);
}
if ($PATH === '/api/admin/face' && $METHOD === 'DELETE') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  @unlink(fh_faceFile()); @unlink(fh_facesDir() . '/owner-avatar.png');
  fh_json(['ok' => true]);
}
if ($PATH === '/api/admin/pin' && $METHOD === 'POST') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  $b = fh_readBody() ?: [];
  $np = trim((string)($b['pin'] ?? ''));
  if (!preg_match('/^\d{4,8}$/', $np)) fh_json(['error' => 'الرمز لازم يكون من 4 إلى 8 أرقام'], 400);
  try {
    fh_saveAuth(['pinHash' => fh_hashPin($np), 'changed' => fh_nowIso()]);
    fh_json(['ok' => true, 'token' => fh_newToken()]);
  } catch (Throwable $e) { fh_json(['error' => $e->getMessage()], 500); }
}
if ($PATH === '/api/admin/data' && $METHOD === 'GET') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  fh_json(fh_getData());
}
if ($PATH === '/api/admin/save' && $METHOD === 'POST') {
  if (!fh_isAdmin()) fh_json(['error' => 'unauthorized'], 401);
  $incoming = fh_readBody();
  if (!is_array($incoming)) fh_json(['error' => 'bad payload'], 400);
  $cur = fh_getData();
  $next = ['settings' => $cur['settings'] ?? []];
  foreach (asArr($incoming['settings'] ?? []) as $k => $v) $next['settings'][$k] = $v;
  $lists = ['categories' => 'categories', 'products' => 'products', 'services' => 'services', 'packages' => 'packages', 'testimonials' => 'testimonials', 'faqs' => 'faqs'];
  foreach ($lists as $key => $_) {
    $next[$key] = (isset($incoming[$key]) && is_array($incoming[$key])) ? $incoming[$key] : ($cur[$key] ?? null);
    if ($next[$key] === null) unset($next[$key]); /* مثل undefined في stringify */
  }
  $next['posts'] = (isset($incoming['posts']) && is_array($incoming['posts'])) ? $incoming['posts'] : ($cur['posts'] ?? []);
  try {
    fh_saveData($next);
    fh_buildArt();
    fh_snapshot();
    fh_json(['ok' => true, 'saved' => fh_nowIso(), 'art' => true]);
  } catch (Throwable $e) { fh_json(['error' => $e->getMessage()], 500); }
}
if ($PATH === '/api/admin/upload' && $METHOD === 'POST') {
  fh_handleUpload();
  exit;
}

/* ---------- بطاقة منتج بطباعة QR ---------- */
if (preg_match('#^/admin/card/([^/]+)$#', $PATH, $m) && $METHOD === 'GET') {
  if (!fh_isAdmin()) { http_response_code(401); header('Content-Type: text/html; charset=utf-8'); echo '<h1 dir="rtl">يلزم الدخول من اللوحة</h1>'; exit; }
  $id = $m[1];
  $p = null;
  foreach ($D['products'] as $pp) { if (($pp['id'] ?? null) === $id) { $p = $pp; break; } }
  if (!$p) { http_response_code(404); header('Content-Type: text/html; charset=utf-8'); echo 'غير موجود'; exit; }
  [$proto, $host] = fh_origin();
  $url = $proto . '://' . $host . '/product/' . $p['id'];
  $qr = fh_qrPngDataURL($url);
  $priceTxt = fh_cardPrice($p['price'] ?? 0);
  header('Content-Type: text/html; charset=utf-8');
  echo fh_cardHtml($D, $p, $qr, $url, $host, $priceTxt);
  exit;
}

/* ---------- تصدير نسخة مستقلة ---------- */
if ($PATH === '/admin/export' && $METHOD === 'GET') {
  if (!fh_isAdmin()) { http_response_code(401); header('Content-Type: text/html; charset=utf-8'); echo '<h1 dir="rtl">يلزم الدخول من <a href="/admin">لوحة التحكم</a></h1>'; exit; }
  try {
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: attachment; filename="furat-alhalw-website.html"');
    echo fh_exportHtml();
    exit;
  } catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Export error: ' . $e->getMessage();
    exit;
  }
}

/* ---------- 404 ---------- */
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo fh_absMeta(pageNotFound($D));
exit;
