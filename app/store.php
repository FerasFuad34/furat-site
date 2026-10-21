<?php
/* ===== طبقة التخزين — MySQL (kv) مع تراجع تلقائي لملفات JSON — نفس عقود lib/store.js ===== */
require_once __DIR__ . '/util.php';

define('FH_ROOT', dirname(__DIR__));
define('FH_DATA', FH_ROOT . '/data');
define('FH_DATA_PATH', FH_DATA . '/data.json');
define('FH_CUST_PATH', FH_DATA . '/customers.json');
define('FH_BK_DIR', FH_DATA . '/backups');
define('FH_DB_CFG', FH_DATA . '/db-config.json');
define('FH_LASTSNAP', FH_DATA . '/.lastsnap');

$FH_STORE = ['mode' => 'none', 'link' => null, 'cache' => ['data' => null, 'customers' => null]];

function fh_data_dir() {
  if (!is_dir(FH_DATA)) @mkdir(FH_DATA, 0775, true);
  if (!is_dir(FH_BK_DIR)) @mkdir(FH_BK_DIR, 0775, true);
}

/* يطابق json_decode + تحويل store: الكائنات → مصفوفات، والفراغ يبقى {} (stdClass) */
function fh_fromJson($text, $fallback = null) {
  $v = json_decode($text);
  if ($v === null && trim($text) === '') return $fallback;
  if ($v === null) return $fallback;
  return fh_norm($v);
}
function fh_norm($v) {
  if ($v instanceof stdClass) {
    $vars = get_object_vars($v);
    if (!$vars) return $v;
    $out = [];
    foreach ($vars as $k => $x) $out[$k] = fh_norm($x);
    return $out;
  }
  if (is_array($v)) {
    $out = [];
    foreach ($v as $k => $x) $out[$k] = fh_norm($x);
    return $out;
  }
  return $v;
}

function fh_defaultCustomers() {
  return ['cycles' => ['pre' => 6, 'post' => 12, 'membrane' => 24], 'customers' => []];
}

function fh_cfg() {
  if (is_file(FH_DB_CFG)) {
    $c = fh_fromJson((string)file_get_contents(FH_DB_CFG));
    if (is_array($c) && (jT($c['database'] ?? null) || jT($c['url'] ?? null))) return $c;
  }
  if (jT(getenv('MYSQL_URL') ?: '') || jT(getenv('DB_HOST') ?: '')) {
    $u = getenv('MYSQL_URL') ?: '';
    $cfg = ['url' => jT($u) ? $u : null,
      'host' => getenv('DB_HOST') ?: 'localhost',
      'port' => (int)(getenv('DB_PORT') ?: 3306),
      'user' => getenv('DB_USER') ?: '',
      'password' => getenv('DB_PASS') ?: '',
      'database' => getenv('DB_NAME') ?: ''];
    if (jT($u) && preg_match('#^mysql://(?:([^:@/]*)(?::([^@/]*))?@)?([^/:?]+)(?::(\d+))?/([^?]+)/?#', $u, $m)) {
      $cfg['user'] = urldecode($m[1] ?? '');
      $cfg['password'] = urldecode($m[2] ?? '');
      $cfg['host'] = $m[3];
      $cfg['port'] = isset($m[4]) ? (int)$m[4] : 3306;
      $cfg['database'] = urldecode($m[5]);
    }
    return $cfg;
  }
  return null;
}

function fh_db() {
  global $FH_STORE;
  if ($FH_STORE['link']) return $FH_STORE['link'];
  $cfg = fh_cfg();
  if (!$cfg) return null;
  $host = $cfg['host'] ?? 'localhost';
  if (($cfg['host'] ?? '') === 'localhost' && !filter_var($host, FILTER_VALIDATE_IP)) $host = 'localhost';
  mysqli_report(MYSQLI_REPORT_OFF);
  $port = (int)($cfg['port'] ?? 3306);
  $sock = (!empty($cfg['socket'])) ? $cfg['socket'] : null;
  if ($sock) { $link = @mysqli_init(); if (!$link->options(MYSQLI_OPT_SOCKET, $sock)) { return null; } @$link->real_connect($host, $cfg['user'] ?? '', $cfg['password'] ?? '', $cfg['database'] ?? ''); }
  else $link = @mysqli_connect($host, $cfg['user'] ?? '', $cfg['password'] ?? '', $cfg['database'] ?? '', $port);
  if (!$link || mysqli_connect_error()) return null;
  $link->set_charset('utf8mb4');
  $link->query("CREATE TABLE IF NOT EXISTS kv (name VARCHAR(64) PRIMARY KEY, doc LONGTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $FH_STORE['link'] = $link;
  return $link;
}

function fh_loadFromDb() {
  $link = fh_db();
  if (!$link) return null;
  $res = $link->query('SELECT name, doc FROM kv');
  if (!$res) return null;
  $map = [];
  while ($r = $res->fetch_assoc()) {
    $v = fh_fromJson($r['doc']);
    if ($v !== null) $map[$r['name']] = $v;
  }
  return $map;
}

function fh_readSafe($p, $fallback = null) {
  $tries = [$p, $p . '.safe', $p . '.bak'];
  foreach ($tries as $t) {
    if (is_file($t)) { $v = fh_fromJson((string)file_get_contents($t)); if ($v !== null) return $v; }
  }
  return $fallback;
}

function fh_writeAtomic($p, $v) {
  $tmp = $p . '.tmp';
  file_put_contents($tmp, fh_pretty($v));
  rename($tmp, $p);
  @copy($p, $p . '.safe');
}

/* JSON.stringify(obj, null, 2) حرفياً */
function fh_pretty($v) { return fh_prettyAt($v, 0); }
function fh_prettyAt($v, $depth) {
  $ind = str_repeat('  ', $depth);
  $ind2 = str_repeat('  ', $depth + 1);
  if (is_array($v)) {
    if ($v === []) return '[]';
    if (array_keys($v) === range(0, count($v) - 1)) {
      $o = [];
      foreach ($v as $x) $o[] = $ind2 . fh_prettyAt($x, $depth + 1);
      return "[\n" . implode(",\n", $o) . "\n" . $ind . ']';
    }
    $o = [];
    foreach ($v as $k => $x) $o[] = $ind2 . jsEncStr((string)$k) . ': ' . fh_prettyAt($x, $depth + 1);
    return "{\n" . implode(",\n", $o) . "\n" . $ind . '}';
  }
  if ($v instanceof stdClass) {
    $vars = get_object_vars($v);
    if (!$vars) return '{}';
    $o = [];
    foreach ($vars as $k => $x) $o[] = $ind2 . jsEncStr((string)$k) . ': ' . fh_prettyAt($x, $depth + 1);
    return "{\n" . implode(",\n", $o) . "\n" . $ind . '}';
  }
  return jsEncVal($v);
}

function fh_init() {
  global $FH_STORE;
  if ($FH_STORE['mode'] !== 'none') return;
  fh_data_dir();
  $cfg = fh_cfg();
  if ($cfg) {
    $map = fh_loadFromDb();
    if ($map !== null) {
      $FH_STORE['mode'] = 'mysql';
      $FH_STORE['cache']['data'] = $map['data'] ?? null;
      $FH_STORE['cache']['customers'] = $map['customers'] ?? null;
      if ($FH_STORE['cache']['data'] === null) {
        $FH_STORE['cache']['data'] = fh_readSafe(FH_DATA_PATH);
        if ($FH_STORE['cache']['data'] !== null) fh_upsert('data', $FH_STORE['cache']['data']);
      }
      if ($FH_STORE['cache']['customers'] === null) {
        $FH_STORE['cache']['customers'] = fh_readSafe(FH_CUST_PATH) ?? fh_defaultCustomers();
        fh_upsert('customers', $FH_STORE['cache']['customers']);
      }
      return;
    }
  }
  /* تراجع آمن: ملفات JSON — نفس سلوك store.js عندما لا تتوفر القاعدة */
  $FH_STORE['mode'] = 'file';
}

function fh_upsert($name, $v) {
  $link = fh_db();
  if (!$link) return false;
  $stmt = $link->prepare('INSERT INTO kv (name, doc) VALUES (?, ?) ON DUPLICATE KEY UPDATE doc = VALUES(doc)');
  if (!$stmt) return false;
  $json = jsJSON($v);
  $stmt->bind_param('ss', $name, $json);
  $ok = $stmt->execute();
  $stmt->close();
  return $ok;
}

function fh_getData() {
  global $FH_STORE;
  fh_init();
  if ($FH_STORE['cache']['data'] === null) {
    $FH_STORE['cache']['data'] = fh_readSafe(FH_DATA_PATH);
    if ($FH_STORE['cache']['data'] === null) $FH_STORE['cache']['data'] = fh_readSafe(FH_ROOT . '/../furat-data.json', ['settings' => []]);
  }
  return $FH_STORE['cache']['data'];
}

function fh_getCustomers() {
  global $FH_STORE;
  fh_init();
  if ($FH_STORE['cache']['customers'] === null) {
    $FH_STORE['cache']['customers'] = fh_readSafe(FH_CUST_PATH) ?? fh_defaultCustomers();
  }
  return $FH_STORE['cache']['customers'];
}

function fh_touchMod() { @touch(FH_DATA . '/.datamod'); }

function fh_saveData($v) {
  global $FH_STORE;
  fh_init();
  $FH_STORE['cache']['data'] = $v;
  if ($FH_STORE['mode'] === 'mysql') { if (!fh_upsert('data', $v)) throw new RuntimeException('فشل الحفظ في قاعدة البيانات'); }
  else fh_writeAtomic(FH_DATA_PATH, $v);
  fh_touchMod();
}

function fh_saveCustomers($v) {
  global $FH_STORE;
  fh_init();
  $FH_STORE['cache']['customers'] = $v;
  if ($FH_STORE['mode'] === 'mysql') { if (!fh_upsert('customers', $v)) throw new RuntimeException('فشل الحفظ في قاعدة البيانات'); }
  else fh_writeAtomic(FH_CUST_PATH, $v);
  fh_touchMod();
}

/* ---------- لقطة يومية تحتفظ بآخر 7 لكل نوع (مثل server.js) ---------- */
function fh_snapshot() {
  try {
    fh_data_dir();
    $d = gmdate('Y-m-d');
    $dd = fh_getData();
    if ($dd) file_put_contents(FH_BK_DIR . '/data-' . $d . '.json', fh_pretty($dd));
    $cc = fh_getCustomers();
    if ($cc) file_put_contents(FH_BK_DIR . '/customers-' . $d . '.json', fh_pretty($cc));
    foreach (['data-', 'customers-'] as $pre) {
      $files = [];
      foreach (scandir(FH_BK_DIR) ?: [] as $f) if (strpos($f, $pre) === 0 && substr($f, -5) === '.json') $files[] = $f;
      sort($files);
      $kill = array_slice($files, 0, max(0, count($files) - 7));
      foreach ($kill as $f) @unlink(FH_BK_DIR . '/' . $f);
    }
    file_put_contents(FH_LASTSNAP, (string)(int)round(microtime(true) * 1000));
  } catch (Throwable $e) {}
}
function fh_lastSnap() {
  if (!is_file(FH_LASTSNAP)) return 0;
  return (int)@file_get_contents(FH_LASTSNAP);
}
function fh_isoMs($ms) { return gmdate('Y-m-d\TH:i:s', (int)floor($ms / 1000)) . '.' . str_pad((string)(((int)$ms) % 1000), 3, '0', STR_PAD_LEFT) . 'Z'; }
function fh_nowIso() { return fh_isoMs((int)round(microtime(true) * 1000)); }

/* إعادة توليد ملف الرسوم art.js — مثل buildArt() في server.js */
function fh_buildArt() {
  try {
    require_once __DIR__ . '/art.php';
    $d = fh_getData();
    if (!$d) return false;
    $map = artMap($d);
    $js = 'window.FS_ART=' . str_replace('</', '<\\/', jsJSON($map)) . ';';
    $target = FH_ROOT . '/assets/js/art.js';
    @mkdir(dirname($target), 0775, true);
    file_put_contents($target, $js, 'utf8');
    return true;
  } catch (Throwable $e) { error_log('buildArt failed: ' . $e->getMessage()); return false; }
}
/* يبني art.js فقط عند الحاجة (بيانات أحدث من الملف) — يعادل «بناء عند الإقلاع وعند الحفظ» */
function fh_maybeBuildArt() {
  $target = FH_ROOT . '/assets/js/art.js';
  $mod = FH_DATA . '/.datamod';
  if (!is_file($target)) { fh_buildArt(); return; }
  if (is_file($mod) && filemtime($mod) > filemtime($target)) fh_buildArt();
}
