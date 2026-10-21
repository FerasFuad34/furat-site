<?php
/* ===== حماية لوحة التحكم — نفس عقد server.js (hash + توكن HMAC + خنق المحاولات) ===== */
require_once __DIR__ . '/util.php';
require_once __DIR__ . '/store.php';

define('FH_AUTH_PATH', FH_DATA . '/admin-auth.json');
define('FH_COOKIE', 'fh_admin');
define('FH_ATTEMPTS', FH_DATA . '/login-attempts.json');

function fh_defaultPin() { $e = getenv('FH_PIN'); return jT($e ?: '') ? $e : '1234'; }
function fh_hashPin($p) { return hash('sha256', 'furat::' . (string)$p); }

function fh_authObj() {
  if (is_file(FH_AUTH_PATH)) {
    $a = fh_fromJson((string)file_get_contents(FH_AUTH_PATH));
    if (is_array($a) && jT($a['pinHash'] ?? null)) return $a;
  }
  return null;
}
function fh_pinHash() {
  $a = fh_authObj();
  return $a ? $a['pinHash'] : fh_hashPin(fh_defaultPin());
}
function fh_isDefaultPin() { return !is_file(FH_AUTH_PATH); }

function fh_sign($v) { return substr(hash_hmac('sha256', (string)$v, fh_pinHash() . '::fh'), 0, 32); }
function fh_newToken() { $v = (string)fh_ms(); return $v . '.' . fh_sign($v); }
function fh_ms() { return (int)round(microtime(true) * 1000); }

function fh_validToken($t) {
  if (!is_string($t) || strpos($t, '.') === false) return false;
  $i = strpos($t, '.');
  $v = substr($t, 0, $i);
  $s = substr($t, $i + 1);
  if (!preg_match('/^\d+$/', $v)) return false;
  if (!hash_equals(fh_sign($v), $s)) return false;
  return fh_ms() - (int)$v < 1000 * 60 * 60 * 12; /* 12 ساعة */
}

function fh_reqToken() {
  $h = $_SERVER['HTTP_X_FH_TOKEN'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
  if (jT($h)) return (strpos($h, 'Bearer ') === 0) ? substr($h, 7) : $h;
  if (isset($_GET['t']) && $_GET['t'] !== '') return (string)$_GET['t'];
  return '';
}
function fh_isAdmin() { return fh_validToken(fh_reqToken()); }

/* ---------- دخول بصورة المالك (كلمة مرور بصرية — اختيار في الإعدادات) ---------- */
function fh_facesDir() { return FH_DATA . '/faces'; }
function fh_faceFile() { return fh_facesDir() . '/owner.jpg'; }
function fh_hasFace() { return is_file(fh_faceFile()); }
function fh_loginMode() {
  $s = fh_getData();
  $m = (string)(($s['settings'] ?? [])['loginMode'] ?? 'pin');
  if (!in_array($m, ['pin', 'face', 'both'], true)) $m = 'pin';
  if (($m === 'face' || $m === 'both') && !fh_hasFace()) $m = 'pin';
  return $m;
}
function fh_faceIssue($cell) {
  $raw = 'f' . ((int)$cell) . '.' . fh_ms();
  return $raw . '.' . substr(hash_hmac('sha256', $raw, fh_pinHash() . '::face'), 0, 32);
}
function fh_faceVerify($tok, $guess) {
  if (!is_string($tok) || substr_count($tok, '.') !== 2) return false;
  [$f, $ts, $sig] = explode('.', $tok);
  if (!preg_match('/^f([0-8])$/', $f, $mm) || !preg_match('/^\d{10,}$/', $ts)) return false;
  $expect = substr(hash_hmac('sha256', $f . '.' . $ts, fh_pinHash() . '::face'), 0, 32);
  if (!hash_equals($expect, $sig)) return false;
  if (fh_ms() - (int)$ts > 1000 * 60 * 2) return false; /* التحدي صالح دقيقتين فقط */
  return (int)$mm[1] === (int)$guess;
}

/* ——— رسم رموز الشبكة: أفاتار دائري لصورة المالك + وجوه كرتونية متنوعة ——— */
function fh_faceAvatarDataUri() {
  $cache = fh_facesDir() . '/owner-avatar.png';
  if (!is_file($cache) || (is_file(fh_faceFile()) && filemtime($cache) < filemtime(fh_faceFile()))) {
    $src = @imagecreatefromjpeg(fh_faceFile());
    if (!$src) return 'data:,error';
    $sq = imagecreatetruecolor(224, 224);
    imagecopy($sq, $src, 0, 0, 0, 0, 224, 224);
    $out = imagecreatetruecolor(224, 224);
    imagealphablending($out, false); imagesavealpha($out, true);
    $tr = imagecolorallocatealpha($out, 0, 0, 0, 127);
    imagefill($out, 0, 0, $tr);
    for ($y = 0; $y < 224; $y++) {          /* قناع دائري يدوي — متوافق مع كل إصدارات GD */
      $dy = $y - 112;
      for ($x = 0; $x < 224; $x++) {
        $dx = $x - 112;
        if ($dx * $dx + $dy * $dy <= 112 * 112) imagesetpixel($out, $x, $y, imagecolorat($sq, $x, $y));
      }
    }
    imagepng($out, $cache);
    imagedestroy($src); imagedestroy($sq); imagedestroy($out);
  }
  return 'data:image/png;base64,' . base64_encode((string)file_get_contents($cache));
}
function fh_faceDecoDataUri($i, $seed) {
  $k = ($i * 3 + $i * $i + $seed) % 8;
  $bg   = [[214,231,239],[228,220,241],[210,236,221],[247,227,204],[206,224,247],[243,213,213],[226,238,214],[238,222,240]];
  $skin = [[242,209,179],[226,176,127],[201,139,93],[166,111,74],[124,84,57],[246,224,201],[212,160,114],[180,124,88]];
  $hair = [[48,40,36],[94,64,42],[28,28,32],[124,88,54],[60,46,66],[146,146,152],[36,36,40],[104,74,58]];
  $cl   = [[52,92,124],[110,70,90],[70,100,86],[120,96,60],[80,80,100],[100,60,60],[60,96,110],[96,80,110]];
  $im = imagecreatetruecolor(224, 224);
  $C = function ($a) use ($im) { return imagecolorallocate($im, $a[0], $a[1], $a[2]); };
  imagefill($im, 0, 0, $C($bg[$k]));
  // كتف + رقبة
  imagefilledellipse($im, 112, 252, 210, 150, $C($cl[$k]));
  imagefilledrectangle($im, 96, 138, 128, 168, $C($skin[$k]));
  // رأس
  imagefilledellipse($im, 112, 108, 116, 132, $C($skin[$k]));
  // شعر — ٤ تسريحات
  $h = $C($hair[$k]);
  $st = $k % 4;
  if ($st === 0) { imagefilledellipse($im, 112, 76, 122, 96, $h); imagefilledrectangle($im, 52, 76, 72, 108, $h); imagefilledrectangle($im, 152, 76, 172, 108, $h); imagefilledellipse($im, 112, 118, 104, 120, $C($skin[$k])); }
  if ($st === 1) { imagefilledarc($im, 112, 96, 124, 136, 180, 360, $h, IMG_ARC_PIE); imagefilledrectangle($im, 50, 90, 174, 104, $C($skin[$k])); }
  if ($st === 2) { imagefilledellipse($im, 112, 68, 60, 40, $h); imagefilledarc($im, 112, 92, 120, 118, 180, 360, $h, IMG_ARC_PIE); imagefilledrectangle($im, 52, 88, 172, 102, $C($skin[$k])); }
  if ($st === 3) { imagefilledarc($im, 112, 86, 118, 108, 180, 360, $h, IMG_ARC_PIE); imagefilledrectangle($im, 53, 82, 171, 94, $C($skin[$k])); }
  // عيون + حواجب + فم
  $dk = imagecolorallocate($im, 30, 30, 34);
  imagefilledellipse($im, 86, 106, 13, 15, $dk); imagefilledellipse($im, 138, 106, 13, 15, $dk);
  imageline($im, 74, 90, 98, 88, $dk); imagesetthickness($im, 3);
  imageline($im, 126, 88, 150, 90, $dk);
  imagesetthickness($im, 0);
  imagesetthickness($im, 4); imagearc($im, 112, 132, 44, 28, 15, 165, imagecolorallocate($im, 176, 84, 74)); imagesetthickness($im, 0);
  // نظارة عند بعض الوجوه
  if ($k % 3 === 1) {
    $fr = imagecolorallocate($im, 60, 60, 70);
    imagesetthickness($im, 3);
    imageellipse($im, 86, 106, 40, 38, $fr); imageellipse($im, 138, 106, 40, 38, $fr);
    imageline($im, 106, 106, 118, 106, $fr);
    imagesetthickness($im, 0);
  }
  // دائرة قصّ موحّدة (يظهر جزء من الخلفية في الأركان كما بالأفاتار)
  imagefilledellipse($im, 112, 112, 224, 224, $C($bg[$k]));
  ob_start(); imagejpeg($im, null, 88); $bin = (string)ob_get_clean();
  imagedestroy($im);
  return 'data:image/jpeg;base64,' . base64_encode($bin);
}

/* ---------- خنق تسجيل الدخول: 8 فاشلة = 10 دقائق لكل IP ---------- */
function fh_clientIp() {
  $xf = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
  if (jT($xf)) {
    $first = trim(explode(',', (string)$xf)[0]);
    if (jT($first)) return $first;
  }
  return (string)($_SERVER['REMOTE_ADDR'] ?? 'x');
}
function fh_throttleCount($ip) {
  $now = fh_ms();
  $fp = @fopen(FH_ATTEMPTS, 'c+');
  if (!$fp) return 0;
  flock($fp, LOCK_EX);
  $raw = (string)stream_get_contents($fp);
  $map = json_decode($raw, true);
  if (!is_array($map)) $map = [];
  $a = $map[$ip] ?? null;
  if (!$a || $now - (int)($a['t'] ?? 0) > 10 * 60 * 1000) { $n = 0; } else { $n = (int)$a['n']; }
  flock($fp, LOCK_UN);
  fclose($fp);
  return $n;
}
function fh_throttleBump($ip) {
  $now = fh_ms();
  $fp = @fopen(FH_ATTEMPTS, 'c+');
  if (!$fp) return;
  flock($fp, LOCK_EX);
  $raw = (string)stream_get_contents($fp);
  $map = json_decode($raw, true);
  if (!is_array($map)) $map = [];
  $a = $map[$ip] ?? null;
  if (!$a || $now - (int)$a['t'] > 10 * 60 * 1000) $a = ['n' => 0, 't' => $now];
  $a['n'] = (int)$a['n'] + 1;
  $a['t'] = $now;
  $map[$ip] = $a;
  /* تنظيف القدام */
  foreach ($map as $k => $v) { if (!is_array($v) || $now - (int)($v['t'] ?? 0) > 30 * 60 * 1000) unset($map[$k]); }
  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, json_encode($map, JSON_UNESCAPED_UNICODE));
  flock($fp, LOCK_UN);
  fclose($fp);
  return $a['n'];
}
function fh_throttleClear($ip) {
  $fp = @fopen(FH_ATTEMPTS, 'c+');
  if (!$fp) return;
  flock($fp, LOCK_EX);
  $raw = (string)stream_get_contents($fp);
  $map = json_decode($raw, true);
  if (is_array($map) && isset($map[$ip])) {
    unset($map[$ip]);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($map, JSON_UNESCAPED_UNICODE));
  }
  flock($fp, LOCK_UN);
  fclose($fp);
}

function fh_saveAuth($obj) {
  fh_data_dir();
  $tmp = FH_AUTH_PATH . '.tmp';
  file_put_contents($tmp, fh_pretty($obj));
  rename($tmp, FH_AUTH_PATH);
  @copy(FH_AUTH_PATH, FH_AUTH_PATH . '.safe');
}
