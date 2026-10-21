<?php
/* ===== مثبّت الفرات الحلو — يجهّز MySQL وينقل البيانات من ملفات JSON =====
   طريقة الاستخدام:
   1) سطر أوامر:  php install.php --host=localhost --user=u --pass=p --db=furat [--prefix=]
   2) المتصفح:    افتح /install.php — املأ بيانات قاعدة Hostinger ثم احذف الملف بعد نجاح التثبيت
*/
require_once __DIR__ . '/app/store.php';
require_once __DIR__ . '/app/auth.php';

$cli = PHP_SAPI === 'cli';
$errors = [];
$done = null;

/* إعادة التثبيت بعد وجود إعداد سابق تتطلب رمز اللوحة */
$gateErr = false;
if (!$cli && file_exists(FH_DB_CFG) && $_SERVER['REQUEST_METHOD'] ?? 'GET' === 'POST') {
  $pin = trim((string)($_POST['pin'] ?? ''));
  if ($pin === '' || fh_hashPin($pin) !== fh_pinHash()) $gateErr = true;
} elseif (!$cli && file_exists(FH_DB_CFG) && !fh_isAdmin()) {
  $gateErr = false; // نموذج يطلب الرمز
}
if (!$cli && file_exists(FH_DB_CFG) && !$gateErr && $_SERVER['REQUEST_METHOD'] ?? 'GET' !== 'POST') { $askPin = true; } else { $askPin = false; }
if ($gateErr || $askPin) {
  ?><!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تأكيد</title></head>
  <body style="font-family:Tahoma;background:#F6FBFD;display:flex;justify-content:center;padding:60px">
  <div style="background:#fff;border:1px solid #D7E4EC;border-radius:16px;padding:28px;max-width:420px;text-align:center">
    <?php if ($gateErr): ?><div style="background:#FDECEA;color:#A33;padding:10px;border-radius:8px;font-size:13px;margin-bottom:12px">رمز غير صحيح — لم يتغير أي شيء</div><?php endif; ?>
    <h1 style="font-size:17px;color:#073B57">التثبيت مُعاد — أدخل رمز دخول اللوحة لتأكيد إعادة الإعداد</h1>
    <form method="post"><input name="pin" type="password" placeholder="رمز اللوحة" style="padding:10px;width:100%;box-sizing:border-box;margin:10px 0">
    <input name="host" type="hidden" value="localhost"><button style="padding:10px 22px;border:0;border-radius:8px;background:#073B57;color:#fff;font-weight:700">تأكيد</button></form>
  </div></body></html><?php
  exit;
}

if ($_SERVER['REQUEST_METHOD'] ?? 'GET' === 'POST' || $cli) {
  $args = [];
  if ($cli) {
    foreach (array_slice($_SERVER['argv'], 1) as $a) {
      if (preg_match('/^--([a-z]+)=(.*)$/s', $a, $m)) $args[$m[1]] = $m[2];
    }
  } else {
    foreach (['host', 'user', 'pass', 'db', 'port'] as $k) $args[$k] = (string)($_POST[$k] ?? '');
    if (file_exists(FH_DB_CFG) && !$args['db']) {
      $c = fh_fromJson((string)file_get_contents(FH_DB_CFG)) ?: [];
      foreach (['host', 'user', 'pass', 'db', 'port'] as $k) $args[$k === 'db' ? 'database' : $k] = $args[$k] ?: ($c[$k] ?? '');
      if (!$args['db']) $args['db'] = $c['database'] ?? '';
    }
  }
  $host = $args['host'] ?? 'localhost';
  $port = (int)($args['port'] ?? 0) ?: 3306;
  $user = $args['user'] ?? '';
  $pass = $args['pass'] ?? '';
  $dbname = $args['db'] ?? '';
  if (!$dbname) $errors[] = 'اسم القاعدة مطلوب';
  else {
    mysqli_report(MYSQLI_REPORT_OFF);
    $link = @mysqli_connect($host, $user, $pass, $dbname, $port);
    if (!$link) $errors[] = 'تعذّر الاتصال: ' . mysqli_connect_error();
    else {
      $link->set_charset('utf8mb4');
      $q = $link->query('SELECT 1');
      if (!$q) $errors[] = 'القاعدة غير قابلة للقراءة';
      else {
        $link->query("CREATE TABLE IF NOT EXISTS kv (name VARCHAR(64) PRIMARY KEY, doc LONGTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        // البذرة: لا تلمس موجودًا — انسخ من ملفات JSON فقط عند الفراغ
        $seed = [];
        foreach (['data' => FH_DATA_PATH, 'customers' => FH_CUST_PATH] as $name => $fp) {
          $res = $link->query("SELECT COUNT(*) c FROM kv WHERE name='" . $name . "'");
          $row = $res ? $res->fetch_assoc() : null;
          if ($row && (int)$row['c'] === 0 && is_file($fp)) {
            $doc = (string)file_get_contents($fp);
            $st = $link->prepare("INSERT INTO kv (name, doc) VALUES (?, ?)");
            $st->bind_param('ss', $name, $doc);
            $st->execute();
            $st->close();
            $seed[] = $name;
          }
        }
        file_put_contents(FH_DB_CFG, json_encode(['host' => $host, 'port' => $port, 'user' => $user, 'password' => $pass, 'database' => $dbname], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        @chmod(FH_DB_CFG, 0600);
        $done = 'تم الاتصال. الجدول kv جاهز.' . ($seed ? ' نُقلت البيانات: ' . implode('، ', $seed) . '.' : ' لم تُنقل بيانات جديدة (القاعدة تحتوي أصولها أو لا يوجد ملفات بذرة).');
        $link->close();
      }
    }
  }
  if ($cli) {
    foreach ($errors as $e) fwrite(STDERR, "خطأ: $e\n");
    if ($done) echo $done . "\nلا تنس حذف install.php من السيرفر.\n";
    exit($errors ? 1 : 0);
  }
}

?><!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تثبيت قاعدة البيانات</title></head><body style="font-family:Tahoma;background:#F6FBFD;display:flex;justify-content:center;padding:40px">
<div style="background:#fff;border:1px solid #D7E4EC;border-radius:16px;padding:28px;max-width:560px">
<?php if ($done): ?>
  <div class="msg ok" style="padding:14px;border-radius:10px;background:#E6F6EC;color:#1B6B33;font-size:15px">✅ <?php echo htmlspecialchars($done) ?><br><br>
  <b>الخطوة الأخيرة:</b> احذف ملف <code>install.php</code> من السيرفر الآن.</div>
<?php else: ?>
  <?php foreach ($errors as $e): ?><div style="padding:12px;border-radius:10px;background:#FDECEA;color:#A33;font-size:13px;margin-bottom:10px"><?php echo htmlspecialchars($e) ?> — لم يتغير أي شيء؛ الموقع مستمر بملفات JSON.</div><?php endforeach; ?>
  <h1 style="font-size:20px;color:#073B57">تثبيت قاعدة البيانات (MySQL)</h1>
  <p style="color:#5A7184;font-size:13px">الصق بيانات MySQL من لوحة Hostinger.</p>
  <form method="post">
    <?php if (file_exists(FH_DB_CFG)): ?><label>رمز دخول اللوحة</label><input name="pin" type="password" style="padding:10px;width:100%;box-sizing:border-box"><?php endif; ?>
    <label>الخادم</label><input name="host" value="localhost" style="padding:10px;width:100%;box-sizing:border-box" dir="ltr">
    <label>اسم المستخدم</label><input name="user" style="padding:10px;width:100%;box-sizing:border-box" dir="ltr">
    <label>كلمة السر</label><input name="pass" type="password" style="padding:10px;width:100%;box-sizing:border-box" dir="ltr">
    <label>اسم القاعدة</label><input name="db" style="padding:10px;width:100%;box-sizing:border-box" dir="ltr">
    <label>المنفذ (اختياري)</label><input name="port" placeholder="3306" style="padding:10px;width:100%;box-sizing:border-box" dir="ltr">
    <button type="submit" style="margin-top:16px;width:100%;background:#073B57;color:#fff;border:0;border-radius:10px;padding:12px;font-size:15px;font-weight:700">وصّل وانسخ البيانات</button>
  </form>
<?php endif; ?>
</div></body></html>
