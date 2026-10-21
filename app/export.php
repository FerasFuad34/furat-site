<?php
/* ===== تصدير نسخة مستقلة بملف واحد — يعادل مسار /admin/export في server.js (بإصلاح الصفحات المحذوفة) ===== */
require_once __DIR__ . '/util.php';
require_once __DIR__ . '/store.php';
require_once __DIR__ . '/render.php';

function fh_exportHtml() {
  $d = fh_getData();
  $art = artMap($d);
  $css = file_get_contents(FH_ROOT . '/assets/css/style.css');
  $js = file_get_contents(FH_ROOT . '/assets/js/app.js');

  $embed = function ($h) {
    return preg_replace_callback('/(src|href)="\/assets\/(logo\/[^"]+|favicon\.png)"/', function ($m) {
      $f = $m[2];
      $real = (strpos($f, 'logo/') === 0) ? FH_ROOT . '/assets/logo/' . substr($f, 5) : FH_ROOT . '/assets/' . $f;
      if (!is_file($real)) return $m[0];
      $mime = (substr($real, -4) === '.svg') ? 'svg+xml' : 'png';
      return $m[1] . '="data:image/' . $mime . ';base64,' . base64_encode(file_get_contents($real)) . '"';
    }, $h);
  };

  $html = pageHome($d);
  $html = preg_replace_callback('/<link rel="stylesheet" href="\/assets\/css\/style\.css[^"]*">/', fn() => '<style>' . $css . '</style>', $html, 1);
  $fsObj = str_replace('</', '<\\/', jsJSON(['products' => $d['products'], 'categories' => $d['categories'], 'settings' => $d['settings']]));
  $artObj = str_replace('</', '<\\/', jsJSON($art));
  $html = preg_replace('/<script src="\/assets\/js\/art\.js[^"]*" defer><\/script>/', '', $html, 1);
  $html = preg_replace_callback('/<script src="\/assets\/js\/app\.js[^"]*" defer><\/script>/', function () use ($fsObj, $js, $artObj) {
    return '<script>window.FS=' . $fsObj . ';window.FS_ART=' . $artObj . ';window.FH_STANDALONE=true;</script><script>' . $js . '</script>';
  }, $html, 1);
  $html = preg_replace('/href="\/(products|services|packages|tools|about|contact)(\?[^"]*)?"/', 'href="#" data-goto="$1"', $html);
  $html = str_replace('href="/"', 'href="#" data-goto="home"', $html);
  $html = str_replace('<a class="skip" href="#main">', '<a class="skip" href="#main" data-skip>', $html);
  $html = $embed($html);

  $store = [];
  /* صفحات حُذفت أصلاً (packages/tools) تُتخطى — كانت تُسقط التصدير بالـ500 */
  foreach (['products' => 'pageProducts', 'services' => 'pageServices', 'about' => 'pageAbout', 'contact' => 'pageContact'] as $k => $fnName) {
    $sub = $fnName($d);
    $sub = preg_replace('/<link rel="stylesheet" href="\/assets\/css\/style\.css[^"]*">/', '', $sub, 1);
    $sub = preg_replace('/<script src="\/assets\/js\/(art|app)\.js[^"]*" defer><\/script>/', '', $sub);
    $m1 = strpos($sub, '<main id="main">');
    $m2 = strpos($sub, '</main>', $m1);
    $store[$k] = $embed(substr($sub, $m1 + 15, $m2 - $m1 - 15));
  }

  $prodPages = [];
  foreach ($d['products'] as $p) {
    $sub = pageProduct($d, $p);
    $sub = preg_replace('/<link rel="stylesheet" href="\/assets\/css\/style\.css[^"]*">/', '', $sub, 1);
    $sub = preg_replace('/<script src="\/assets\/js\/(art|app)\.js[^"]*" defer><\/script>/', '', $sub);
    $m1 = strpos($sub, '<main id="main">');
    $m2 = strpos($sub, '</main>', $m1);
    $inner = $embed(substr($sub, $m1 + 15, $m2 - $m1 - 15));
    $inner = preg_replace('/href="\/(products|services|packages|tools|about|contact)(\?[^"]*)?"/', 'href="#" data-goto="$1"', $inner);
    $inner = str_replace('href="/"', 'href="#" data-goto="home"', $inner);
    $prodPages[$p['id']] = $inner;
  }

  $pageDivs = '';
  foreach ($store as $k => $v) $pageDivs .= '<div data-page="' . $k . '" hidden>' . $v . '</div>';
  $navScript = "\n" . '<div id="fhPages" style="display:none">' . $pageDivs . '</div>'
    . "\n" . '<script>
(function(){
  var main=document.querySelector(\'#main\');
  var homeHTML=main.innerHTML;
  function go(name){
    if(name===\'home\'){main.innerHTML=homeHTML;}
    else{var el=document.querySelector(\'[data-page="\'+name+\'"]\');main.innerHTML=el?el.innerHTML:homeHTML;}
    window.scrollTo({top:0});
    document.querySelectorAll(\'#main [data-art]\').forEach(function(n){
      var svg=(window.FS_ART||{})[n.getAttribute(\'data-art\')]; if(svg&&!n.dataset.done){n.innerHTML=svg;n.dataset.done=\'1\';}
    });
    document.querySelectorAll(\'#main .reveal\').forEach(function(n){n.classList.add(\'in\');});
    if(window.FH_init) window.FH_init();
  }
  document.addEventListener(\'click\',function(e){
    var a=e.target.closest(\'[data-goto]\');
    if(a){e.preventDefault();go(a.getAttribute(\'data-goto\'));}
    var pd=e.target.closest(\'.pdetail, .pcard a[href^="product"]\');
  });
  // بطاقات المنتج تفتح تفاصيله
  document.addEventListener(\'click\',function(e){
    var card=e.target.closest(\'.pcard\');
    if(card && !e.target.closest(\'button\') && !e.target.closest(\'a\')){
      var id=card.getAttribute(\'data-id\');
      var pg=document.querySelector(\'[data-page="products"]\');
      // ابحث عن صفحة المنتج ضمن البيانات المصدّرة
      if(window.FH_productPages && window.FH_productPages[id]){
        main.innerHTML=window.FH_productPages[id];
        window.scrollTo({top:0});
        main.querySelectorAll(\'[data-art]\').forEach(function(n){var s=(window.FS_ART||{})[n.getAttribute(\'data-art\')];if(s&&!n.dataset.done){n.innerHTML=s;n.dataset.done=\'1\';}});
        main.querySelectorAll(\'.reveal\').forEach(function(n){n.classList.add(\'in\');});
        if(window.FH_init) window.FH_init();
      }
    }
  });
})();
</script>';

  $prodJson = str_replace('</', '<\\/', jsJSON($prodPages));
  $html = preg_replace_callback('/<\/body>/', function () use ($prodJson, $navScript) {
    return '<script>window.FH_productPages=' . $prodJson . ';</script>' . $navScript . '</body>';
  }, $html, 1);
  return $html;
}
