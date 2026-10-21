<?php
/* ===== بطاقة المنتج مع QR — نسخة طبق الأصل من مسار /admin/card/:id ===== */
require_once __DIR__ . '/util.php';

function fh_cardPrice($p) {
  $f = (float)$p;
  if (abs($f - round($f)) < 1e-9) return number_format(abs($f) < 1e15 ? $f : 0, 0, '.', ',');
  return number_format($f, ($f >= 1000) ? 0 : min(3, strlen(substr(strrchr((string)$f, '.'), 1)) ?: 0), '.', ',');
}

function fh_cardHtml($d, $p, $qr, $url, $host, $priceTxt) {
  $name = $p['name'];
  $brand = $d['settings']['nameFull'];
  $pid = $p['id'];
  $sarSvg = '<svg viewBox="0 0 1124.14 1256.39" style="width:.9em;height:1em;vertical-align:-.12em;display:inline-block" role="img" aria-label="ريال"><path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/><path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/></svg>';
  return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>بطاقة ' . $name . '</title>'
    . "\n" . '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">'
    . "\n" . '<style>
  *{box-sizing:border-box;margin:0}
  body{font-family:\'Tajawal\',Tahoma,sans-serif;background:#EEF4F8;padding:24px;display:flex;flex-wrap:wrap;gap:18px;justify-content:center}
  .card{width:90mm;height:54mm;background:#fff;border:1.2px solid #073B57;border-radius:5mm;padding:5mm 6mm;display:flex;gap:5mm;align-items:center;position:relative;overflow:hidden}
  .card::before{content:\'\';position:absolute;inset-inline-start:0;top:0;bottom:0;width:2.5mm;background:#E8A33D}
  .txt{flex:1;display:flex;flex-direction:column;gap:1.5mm}
  .brand{font-family:\'Cairo\';font-weight:900;color:#073B57;font-size:11pt;line-height:1.2}
  .brand i{display:block;font-style:normal;font-weight:700;color:#1478A0;font-size:7.5pt}
  .name{font-weight:700;color:#0E2233;font-size:10pt;line-height:1.35;margin-top:1mm}
  .price{font-family:\'Cairo\';font-weight:900;color:#073B57;font-size:15pt}.price span{font-size:8pt;font-weight:700;color:#5A7184}
  .url{font-size:6.6pt;color:#5A7184;direction:ltr;text-align:right;margin-top:auto}
  .qr{width:30mm;height:30mm;flex:none}
  .qr img{width:100%;height:100%;display:block}
  .qr b{display:block;text-align:center;font-size:6.6pt;color:#1478A0;font-weight:700;margin-top:1mm}
  .acts{width:100%;text-align:center}
  button{font-family:\'Cairo\';font-weight:800;background:#073B57;color:#fff;border:0;border-radius:10px;padding:10px 26px;cursor:pointer;font-size:11pt}
  @media print{body{background:#fff;padding:0;gap:0}.acts{display:none}.card{page-break-inside:avoid;margin:0 auto;border-color:#073B57}}
</style></head><body>
  <div class="card">
    <div class="txt">
      <div class="brand">' . $brand . '<i>بيع • تركيب • صيانة</i></div>
      <div class="name">' . $name . '</div>
      <div class="price">' . $priceTxt . ' <span>' . $sarSvg . '</span></div>
      <div class="url">' . $host . '/product/' . $pid . '</div>
    </div>
    <div class="qr"><img src="' . $qr . '" alt="QR"><b>امسح للتفاصيل والطلب</b></div>
  </div>
  <div class="acts"><button onclick="window.print()">🖨 طباعة البطاقة</button></div>
</body></html>';
}
