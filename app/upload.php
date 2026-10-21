<?php
/* ===== رفع الصور وتحسينها — يعادل سلوك multer + sharp في server.js ===== */
require_once __DIR__ . '/util.php';
require_once __DIR__ . '/store.php';

define('FH_UPLOAD_DIR', FH_ROOT . '/assets/uploads');

function fh_uploadFilename($originalName) {
  $ext = '.' . strtolower(pathinfo((string)$originalName, PATHINFO_EXTENSION));
  if ($ext === '.') $ext = '.jpg';
  $ext = preg_replace('/[^.a-z0-9]/', '', $ext);
  if (!in_array($ext, ['.jpg', '.jpeg', '.png', '.webp'], true)) $ext = '.jpg';
  mt_srand();
  return 'p' . fh_ms() . random_int(0, 998) . $ext;
}

function fh_imageLoad($path, $mime) {
  switch ($mime) {
    case 'image/jpeg': return function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($path) : false;
    case 'image/png': return function_exists('imagecreatefrompng') ? @imagecreatefrompng($path) : false;
    case 'image/webp': return function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false;
    case 'image/gif': return function_exists('imagecreatefromgif') ? @imagecreatefromgif($path) : false;
  }
  return false;
}

function fh_orientImage($img, $orient) {
  $out = $img;
  switch ($orient) {
    case 2: $r = imagecreatetruecolor(imagesx($img), imagesy($img)); imagecopy($r, $img, 0, 0, 0, 0, imagesx($img), imagesy($img)); imageflip($r, IMG_FLIP_HORIZONTAL); $out = $r; break;
    case 3: $out = imagerotate($img, 180, 0); break;
    case 4: $r = imagecreatetruecolor(imagesx($img), imagesy($img)); imagecopy($r, $img, 0, 0, 0, 0, imagesx($img), imagesy($img)); imageflip($r, IMG_FLIP_VERTICAL); $out = $r; break;
    case 5: $out = imagerotate($img, -90, 0); imageflip($out, IMG_FLIP_HORIZONTAL); break;
    case 6: $out = imagerotate($img, -90, 0); break;
    case 7: $out = imagerotate($img, 90, 0); imageflip($out, IMG_FLIP_HORIZONTAL); break;
    case 8: $out = imagerotate($img, 90, 0); break;
  }
  if ($out !== $img) imagedestroy($img);
  return $out;
}

/* يحاكي أنبوب sharp: تدوير → تصغير داخل 1400 → خلفية مربعة مطموسة 38°+سطوع 1.05 → أمامية 94% → ضغط */
function fh_optimizeUpload($path) {
  if (!function_exists('imagecreatetruecolor')) return ['optimized' => false];
  try {
    $info = @getimagesize($path);
    if (!$info) return ['optimized' => false, 'error' => 'bad image'];
    $mime = $info['mime'] ?? '';
    $img = fh_imageLoad($path, $mime);
    if (!$img) return ['optimized' => false, 'error' => 'loader missing'];
    $metaW = imagesx($img); $metaH = imagesy($img);
    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
      $ex = @exif_read_data($path);
      if ($ex && !empty($ex['Orientation'])) $img = fh_orientImage($img, (int)$ex['Orientation']);
    }
    $w = imagesx($img); $h = imagesy($img);
    $scale = min(1, 1400 / max($w, $h));
    $nw = (int)max(1, round($w * $scale)); $nh = (int)max(1, round($h * $scale));
    $rs = imagecreatetruecolor($nw, $nh);
    imagealphablending($rs, false); imagesavealpha($rs, true);
    imagefill($rs, 0, 0, imagecolorallocatealpha($rs, 0, 0, 0, 127));
    imagecopyresampled($rs, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
    imagedestroy($img);
    $side = max($nw, $nh);
    /* الخلفية: قص مربع غطائي + تمويه (تقريب blur 38 عبر تصغير وتكبير) + سطوع 1.05 */
    $crop = (int)round(($side - min($nw, $nh)) / 2);
    $bg = imagecreatetruecolor($side, $side);
    $small = 16;
    $tmp = imagecreatetruecolor($small, $small);
    imagecopyresampled($tmp, $rs, 0, 0, ($nw === $side ? $crop : 0), ($nh === $side ? $crop : 0), $small, $small, min($nw, $side), min($nh, $side));
    imagealphablending($bg, false); imagefill($bg, 0, 0, imagecolorallocate($bg, 246, 251, 253)); imagealphablending($bg, true);
    imagecopyresampled($bg, $tmp, 0, 0, 0, 0, $side, $side, $small, $small);
    imagedestroy($tmp);
    imagefilter($bg, IMG_FILTER_BRIGHTNESS, 13);
    /* الأمامية داخل 94% مع وسْط */
    $fgS = (int)round($side * 0.94);
    $fs = min(1, $fgS / max($nw, $nh));
    $fw = (int)max(1, round($nw * $fs)); $fh = (int)max(1, round($nh * $fs));
    $fg = imagecreatetruecolor($fw, $fh);
    imagealphablending($fg, false); imagesavealpha($fg, true);
    imagefill($fg, 0, 0, imagecolorallocatealpha($fg, 0, 0, 0, 127));
    imagecopyresampled($fg, $rs, 0, 0, 0, 0, $fw, $fh, $nw, $nh);
    imagedestroy($rs);
    imagealphablending($bg, true);
    imagecopy($bg, $fg, (int)round(($side - $fw) / 2), (int)round(($side - $fh) / 2), 0, 0, $fw, $fh);
    imagedestroy($fg);
    imagesavealpha($bg, false);
    /* الترميز حسب الامتداد — مثل فرع sharp */
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $tmpOut = $path . '.opt';
    $ok = false;
    if ($ext === 'png' && function_exists('imagepng')) $ok = imagepng($bg, $tmpOut, 9);
    elseif ($ext === 'webp' && function_exists('imagewebp')) $ok = imagewebp($bg, $tmpOut, 82);
    elseif (function_exists('imagejpeg')) $ok = imagejpeg($bg, $tmpOut, 86);
    imagedestroy($bg);
    if (!$ok) { @unlink($tmpOut); return ['optimized' => false]; }
    $before = filesize($path);
    $after = filesize($tmpOut);
    if ($after < $before) {
      rename($tmpOut, $path);
      return ['optimized' => true, 'before' => $before, 'after' => $after, 'w' => $metaW];
    }
    unlink($tmpOut);
    return ['optimized' => false, 'keptOriginal' => true];
  } catch (Throwable $e) {
    @unlink($path . '.opt');
    error_log('[upload] فشل التحسين — حفظت الأصل: ' . $e->getMessage());
    return ['optimized' => false, 'error' => $e->getMessage()];
  }
}

/* يعالج طلب الرفع بالكامل — يعيد [status, payload] */
function fh_handleUpload() {
  header('Content-Type: application/json; charset=utf-8');
  if (!fh_isAdmin()) { http_response_code(401); echo jsJSON(['error' => 'unauthorized']); return; }
  $f = $_FILES['img'] ?? null;
  if (!$f) { http_response_code(400); echo jsJSON(['error' => 'ما وصل ملف']); return; }
  if ((int)($f['error'] ?? 1) !== UPLOAD_ERR_OK) { http_response_code(400); echo jsJSON(['error' => 'الملف كبير أو غير صالح (الحد 15MB)']); return; }
  if ((int)$f['size'] > 15 * 1024 * 1024) { http_response_code(400); echo jsJSON(['error' => 'الملف كبير أو غير صالح (الحد 15MB)']); return; }
  $mime = (string)($f['type'] ?? '');
  if (!preg_match('/^image\/(jpeg|png|webp|gif)$/', $mime)) { http_response_code(400); echo jsJSON(['error' => 'الملف كبير أو غير صالح (الحد 15MB)']); return; }
  @mkdir(FH_UPLOAD_DIR, 0775, true);
  $name = fh_uploadFilename($f['name'] ?? 'x.jpg');
  $dest = FH_UPLOAD_DIR . '/' . $name;
  if (!move_uploaded_file($f['tmp_name'], $dest)) { http_response_code(500); echo jsJSON(['error' => 'فشل حفظ الملف']); return; }
  $info = fh_optimizeUpload($dest);
  echo jsJSON(['ok' => true, 'url' => '/assets/uploads/' . $name, 'optimized' => (bool)($info['optimized'] ?? false)]);
}
