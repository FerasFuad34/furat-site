<?php
/* لقطة يدوية اختيارية عبر Cron — تقبل التنفيذ من سطر الأوامر فقط */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }
require __DIR__ . '/app/store.php';
fh_snapshot();
echo "snapshot ok\n";
