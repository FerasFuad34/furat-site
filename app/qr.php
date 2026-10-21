<?php
/* ===== توليد QR لبطاقات المنتج — مكتبة qrcode-generator (MIT) عبر GD ===== */
require_once __DIR__ . '/util.php';

function fh_qrPngDataURL($text) {
  static $lib = null;
  if ($lib === null) {
    require_once __DIR__ . '/qrlib/qrcode.php';
    $lib = true;
  }
  $qr = QRCode::getMinimumQRCode($text, QR_ERROR_CORRECT_LEVEL_M);
  $mc = $qr->getModuleCount();
  $size = intdiv(300, $mc + 2);
  if ($size < 1) $size = 1;
  $img = $qr->createImage($size, $size, 0x073B57, 0xFFFFFF, false); /* هوامش بمقياس وحدة ≈ margin:1 عند عرض 300px */
  ob_start();
  imagepng($img);
  $bin = ob_get_clean();
  imagedestroy($img);
  return 'data:image/png;base64,' . base64_encode($bin);
}
