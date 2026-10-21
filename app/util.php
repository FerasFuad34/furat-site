<?php
/* ===== الفرات الحلو — أدوات الطبقة الوسطى (تكافئ lib/render.js helpers + JSON semantics) ===== */

/* ---------- JS Number → string (أقصر تمثيل دوير، مثل String(n) في JS) ---------- */
function jsNum($x) {
  if (is_int($x)) return (string)$x;
  if (!is_float($x)) return (string)$x;
  if (is_nan($x) || is_infinite($x)) return 'null';
  if ($x == (float)(int)$x && abs($x) < 1e15) return (string)(int)$x;
  $s = null;
  for ($p = 1; $p <= 17; $p++) { $s = sprintf("%." . $p . "G", $x); if ((float)$s === $x) break; }
  if (stripos($s, 'e') === false) return $s;
  /* تنسيق JS: k * 10^e عند |e| كبير — PHP يستبدل Ae+B في نفس النطاق غالبًا، فوحّد الحرف */
  $s = strtolower($s);
  $s = preg_replace('/e\+0*(\d+)/', 'e+$1', $s);
  return $s;
}

/* ---------- JS truthy ---------- */
function jT($v) {
  if ($v === null || $v === false) return false;
  if ($v === 0 || $v === 0.0) return false;
  if ($v === '' || $v === '0') return false;
  if (is_array($v) && $v === []) return true;   /* [] truthy في JS */
  return (bool)$v;
}
function jStr($v) { /* String(v) للمدخلات النصية لدينا */
  if ($v === null) return '';
  if ($v === true) return 'true';
  if ($v === false) return 'false';
  if (is_float($v)) return jsNum($v);
  return (string)$v;
}

/* ---------- esc (يطابق replace(/[&<>"']/g ...) في JS) ---------- */
function esc($s = '') {
  return str_replace(['&', '<', '>', '"', "'"], ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;'], jStr($s));
}
/* esc لقيم قد تكون null/undefined مثل JS: esc(s ?? '') */
function esc0($s) { return esc($s === null ? '' : $s); }

/* ---------- money: Number(n).toLocaleString('en-US') — أسعار صحيحة ---------- */
function money($n) {
  if ($n === 0 || $n === null || $n === false || $n === 0.0) return '';
  $f = (float)$n;
  if (abs($f - round($f)) < 1e-9) return number_format((float)$f, 0, '.', ',');
  $s = jsNum($f);
  /* كسور: لا فواصل ألوف لها في toLocaleString إلا للأس الصحيح — طبّق على الجزء الصحيح */
  if (strpos($s, '.') !== false || strpos($s, 'e') !== false) return $s;
  return $s;
}

function tel($p) { return preg_replace('/[^\d+]/', '', jStr($p)); }

/* ---------- encodeURIComponent كما في JS ---------- */
function jsEnc($s) {
  $r = rawurlencode(jStr($s));
  return str_replace(['%21', '%27', '%28', '%29', '%7E'], ['!', "'", '(', ')', '~'], $r);
}

/* ---------- JSON بمفاهيم JS (تسلسل الإدراج، {} للفراغات، أرقام JS) ---------- */
/* مصفوفة آمنة: الكائن الفارغ ({} في JSON) لا يفجّر وصولاً بالفهارس */
function asArr($v) {
  if (is_array($v)) return $v;
  if (is_object($v)) return get_object_vars($v);
  return [];
}
/* يعيد الكائن الفارغ كما هو (يمثّل {} في JSON)، ويحوّل غير الفارغ لمصفوفة مرتّبة */
function jsNorm($v) {
  if (is_array($v)) {
    $out = [];
    foreach ($v as $k => $x) $out[$k] = jsNorm($x);
    return $out;
  }
  if ($v instanceof stdClass) {
    $vars = get_object_vars($v);
    if (!$vars) return $v;
    $out = [];
    foreach ($vars as $k => $x) $out[$k] = jsNorm($x);
    return $out;
  }
  if (is_float($v) && $v == (float)(int)$v && abs($v) < 1e15) return (int)$v;
  if ($v === true || $v === false || $v === null) return $v;
  if (is_string($v)) return $v;
  if (is_int($v)) return $v;
  return $v;
}
function jsJSON($v) {
  return jsEncVal(jsNorm($v));
}
function jsEncVal($v) {
  if ($v === null) return 'null';
  if ($v instanceof stdClass) {
    $vars = get_object_vars($v);
    if (!$vars) return '{}';
    $o = [];
    foreach ($vars as $k => $x) $o[] = jsEncStr((string)$k) . ':' . jsEncVal($x);
    return '{' . implode(',', $o) . '}';
  }
  if ($v === true) return 'true';
  if ($v === false) return 'false';
  if (is_int($v)) return (string)$v;
  if (is_float($v)) return jsNum($v);
  if (is_string($v)) return jsEncStr($v);
  if (is_array($v)) {
    if ($v === []) return '[]';
    $isList = array_keys($v) === range(0, count($v) - 1);
    if ($isList) {
      $o = [];
      foreach ($v as $x) $o[] = jsEncVal($x);
      return '[' . implode(',', $o) . ']';
    }
    $o = [];
    foreach ($v as $k => $x) $o[] = jsEncStr((string)$k) . ':' . jsEncVal($x);
    return '{' . implode(',', $o) . '}';
  }
  return 'null';
}
function jsEncStr($s) {
  $out = '"';
  $len = strlen($s);
  for ($i = 0; $i < $len; $i++) {
    $c = $s[$i];
    switch ($c) {
      case '"': $out .= '\\"'; break;
      case '\\': $out .= '\\\\'; break;
      case "\n": $out .= '\\n'; break;
      case "\r": $out .= '\\r'; break;
      case "\t": $out .= '\\t'; break;
      case "\f": $out .= '\\f'; break;
      case "\x08": $out .= '\\b'; break;
      default:
        $o = ord($c);
        if ($o < 0x20) $out .= sprintf('\\u%04x', $o);
        else $out .= $c;
    }
  }
  return $out . '"';
}
/* JS: obj.key === undefined → يسقط المفتاح من stringify؛ و null يبقى.
   في PHP نمثّل «undefined» بالحذف من المصفوفة قبل jsJSON. */

/* ---------- توقيت الرياض (UTC+3 بدون صيفي — مثل riyadhNow في Node) ---------- */
function riyadhNow() {
  $t = time() + 3 * 3600;
  return ['dow' => (int)gmdate('w', $t), 'h' => (int)gmdate('G', $t), 'm' => (int)gmdate('i', $t)];
}

function fmtShort($t) {
  if (!$t) return '—';
  [$h, $m] = array_map('intval', array_pad(explode(':', (string)$t), 2, 0));
  $h24 = $h % 24;
  $per = $h24 >= 12 ? 'م' : 'ص';
  $hh = $h24 % 12 === 0 ? 12 : $h24 % 12;
  return $hh . ':' . str_pad((string)$m, 2, '0', STR_PAD_LEFT) . $per;
}
function fmtLong($t) { /* نسخة openState داخل fmt — بمسافة قبل ص/م */
  if (!$t) return '—';
  [$h, $m] = array_map('intval', array_pad(explode(':', (string)$t), 2, 0));
  $h24 = $h % 24;
  $per = $h24 >= 12 ? 'م' : 'ص';
  $hh = $h24 % 12 === 0 ? 12 : $h24 % 12;
  return $hh . ':' . str_pad((string)$m, 2, '0', STR_PAD_LEFT) . ' ' . $per;
}
function toMin($t) { if (!$t) return null; $a = explode(':', (string)$t); return ((int)$a[0]) * 60 + ((int)($a[1] ?? 0)); }

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_AR = ['sunday' => 'الأحد', 'monday' => 'الاثنين', 'tuesday' => 'الثلاثاء', 'wednesday' => 'الأربعاء', 'thursday' => 'الخميس', 'friday' => 'الجمعة', 'saturday' => 'السبت'];

function hoursUniform($hours) {
  $hours = asArr($hours);
  $days = [];
  foreach (DAY_KEYS as $k) { $hv = $hours[$k] ?? null; $days[] = ($hv === null || $hv === false) ? null : asArr($hv); }
  foreach ($days as $h) { if (!$h || jT($h['closed'] ?? null)) return null; }
  $o = $days[0]['open']; $c = $days[0]['close'];
  foreach ($days as $h) { if (($h['open'] ?? null) !== $o || ($h['close'] ?? null) !== $c) return null; }
  return 'من ' . fmtShort($o) . ' إلى ' . fmtShort($c);
}

function openState($settings) {
  $now = riyadhNow();
  $hours = asArr($settings['hours'] ?? []);
  $key = DAY_KEYS[$now['dow']];
  $today = asArr($hours[$key] ?? []);
  $nowMin = $now['h'] * 60 + $now['m'];
  if (jT($today['closed'] ?? null)) {
    $next = asArr($hours[DAY_KEYS[($now['dow'] + 1) % 7]] ?? []);
    $det = 'نفتح غداً ' . (jT($next['open'] ?? null) ? fmtLong($next['open']) : '—');
    return ['open' => false, 'label' => 'مغلق اليوم', 'detail' => $det];
  }
  $o = toMin($today['open'] ?? null); $c = toMin($today['close'] ?? null);
  $br = ($settings['fridayBreak'] ?? null) && $key === 'friday' ? $settings['fridayBreak'] : null;
  if ($o === null || $c === null) return ['open' => true, 'label' => 'اتصل للتأكد', 'detail' => ''];
  if ($nowMin < $o) return ['open' => false, 'label' => 'مغلق الآن', 'detail' => 'نفتح ' . fmtLong($today['open'])];
  if ($nowMin > $c) return ['open' => false, 'label' => 'مغلق الآن', 'detail' => 'نفتح غداً ' . fmtLong($today['open'])];
  if ($br) {
    $b1 = toMin($br['from'] ?? null); $b2 = toMin($br['to'] ?? null);
    if ($b1 !== null && $b2 !== null && $nowMin >= $b1 && $nowMin < $b2) return ['open' => false, 'label' => 'استراحة', 'detail' => 'نعود ' . fmtLong($br['to'])];
  }
  $left = $c - $nowMin;
  return ['open' => true, 'label' => 'مفتوح الآن', 'detail' => $left <= 60 ? 'يغلق بعد ' . $left . ' دقيقة' : 'حتى ' . fmtLong($today['close'])];
}

function waLink($settings, $text = null) {
  $num = preg_replace('/\D/', '', jStr($settings['whatsapp'] ?? ''));
  $t = $text === null ? 'السلام عليكم، عندي استفسار عن ' . jStr($settings['nameFull'] ?? '') : $text;
  return 'https://wa.me/' . $num . '?text=' . jsEnc($t);
}

const SITE_FONTS = [
  'tajawal' => ['q' => 'Tajawal:wght@400;500;700;800;900'],
  'cairo' => ['q' => 'Cairo:wght@400;500;700;800;900'],
  'almarai' => ['q' => 'Almarai:wght@300;400;700;800'],
  'readex' => ['q' => 'Readex+Pro:wght@300;400;500;700;900'],
  'alexandria' => ['q' => 'Alexandria:wght@300;400;500;700;800'],
];

const ICONS = [
  'home' => '<path d="M3 11.2 12 4l9 7.2"/><path d="M5.5 10v9.5h13V10"/>',
  'cafe' => '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M7 3c0 1.5-1 1.5-1 3M11 3c0 1.5-1 1.5-1 3"/>',
  'cooler' => '<rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M6 9h12"/><circle cx="10" cy="13" r="1"/><circle cx="14" cy="13" r="1"/><path d="M9 17h6"/>',
  'part' => '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
  'central' => '<rect x="3" y="8" width="7" height="13" rx="3.5"/><rect x="14" y="4" width="7" height="17" rx="3.5"/><path d="M3 14h18"/>',
  'install' => '<path d="M14.5 6.5a3.5 3.5 0 0 1 4.6 4.6L9 21.2 4 22l.8-5z"/><path d="M4 4l4 4"/>',
  'wrench' => '<path d="M15.5 3.5a5.5 5.5 0 0 0-5 8.3L3.8 18.5a2 2 0 1 0 2.8 2.8l6.7-6.7a5.5 5.5 0 0 0 6.9-7.3l-3 3-2.6-2.6z"/>',
  'lab' => '<path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-10V3"/><path d="M7.5 14h9"/>',
  'tank' => '<path d="M4 7c4-2 12-2 16 0v9c0 2.5-3.6 4-8 4s-8-1.5-8-4z"/><path d="M4 7c4 2 12 2 16 0"/>',
  'move' => '<path d="M3 9h11v9H3z"/><path d="M14 12h4l3 3v3h-7"/><circle cx="7" cy="19" r="1.8"/><circle cx="17.5" cy="19" r="1.8"/><path d="M6 9V5h5v4"/>',
  'drop' => '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
  'shield' => '<path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  'pin' => '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  'phone' => '<path d="M6.5 3h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/>',
  'wa' => '<path d="M20 11.7A8 8 0 0 1 8.3 20L4 21l1-4.2A8 8 0 1 1 20 11.7z"/><path d="M9 8.6c.4-.1.8 0 1 .4l.7 1.3c.1.3.1.6-.1.8l-.4.5c-.1.2-.2.4-.1.6.4.9 1.2 1.7 2.1 2.1.2.1.4 0 .6-.1l.5-.4c.2-.2.5-.2.8-.1l1.3.7c.4.2.5.6.4 1-.3.9-1.2 1.5-2.1 1.4-2.9-.3-5.3-2.7-5.6-5.6-.1-.9.5-1.8 1.4-2.1z"/>',
  'mail' => '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  'star' => '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8z"/>',
  'check' => '<path d="m5 12.5 4.5 4.5L19 7"/>',
  'x' => '<path d="M6 6l12 12M18 6 6 18"/>',
  'arrow' => '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  'chev' => '<path d="m9 6 6 6-6 6"/>',
  'cart' => '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2.5 3h2.6l2.6 12.2h11L21 7H6"/>',
  'menu' => '<path d="M4 7h16M4 12h16M4 17h16"/>',
  'sun' => '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  'moon' => '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  'spark' => '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  'gauge' => '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4.5-5.5"/><circle cx="12" cy="18" r="1.4"/>',
  'users' => '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20a6.4 6.4 0 0 0-2.4-5"/>',
  'truck' => '<rect x="2" y="7" width="11" height="9" rx="1.5"/><path d="M13 10h4l3 3v3h-7"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  'medal' => '<circle cx="12" cy="14" r="6"/><path d="m8.5 8.5-2-5.5h9l-2 5.5"/><path d="m12 11.5.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
  'layers' => '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3.5 12.5 8.5 4.7 8.5-4.7"/><path d="m3.5 16.8 8.5 4.7 8.5-4.7"/>',
];
function icon($n, $cls = '') {
  $p = ICONS[$n] ?? ICONS['drop'];
  return '<svg class="ic ' . $cls . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $p . '</svg>';
}

/* MONTHS + fmtDate (مدونة — غير مستخدمة في الصفحات الحالية لكنها في المصدر) */
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
function fmtDate($ds) { if (!$ds) return ''; $a = array_map('intval', explode('-', $ds)); return $a[2] . ' ' . MONTHS_AR[$a[1] - 1] . ' ' . $a[0]; }
