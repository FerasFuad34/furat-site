'use strict';
/* مولّد رسوم توضيحية SVG للمنتجات — يعمل بلا صور حقيقية، ويمكن استبداله بصور المنتجات لاحقاً */

const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PALETTE = {
  deep: '#073B57', river: '#1478A0', clear: '#2FB6D8', aqua: '#47D6D2',
  gold: '#E8A33D', honey: '#F5C86B', ink: '#0E2233', steel: '#C9D8E4', steelDark: '#8FA6B8'
};

function bg(id) {
  return `
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F3FBFD"/>
      <stop offset="55%" stop-color="#E4F3F9"/>
      <stop offset="100%" stop-color="#D6EBF4"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#DDE9F1"/>
    </linearGradient>
    <linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9FB4C4"/>
      <stop offset="35%" stop-color="#E7EFF5"/>
      <stop offset="65%" stop-color="#B9CBD8"/>
      <stop offset="100%" stop-color="#8AA1B2"/>
    </linearGradient>
    <linearGradient id="${id}-blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#47D6D2"/>
      <stop offset="50%" stop-color="#22A9C9"/>
      <stop offset="100%" stop-color="#0A5C82"/>
    </linearGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7D896"/>
      <stop offset="55%" stop-color="#E8A33D"/>
      <stop offset="100%" stop-color="#B87A22"/>
    </linearGradient>
  </defs>
  <rect width="400" height="320" fill="url(#${id}-bg)"/>
  <rect width="400" height="320" fill="url(#${id}-glow)"/>
  <circle cx="330" cy="60" r="46" fill="#47D6D2" opacity="0.13"/>
  <circle cx="66" cy="262" r="34" fill="#1478A0" opacity="0.10"/>
  <path d="M0 292 q50 -16 100 0 t100 0 t100 0 t100 0 V320 H0 Z" fill="#2FB6D8" opacity="0.12"/>
  <path d="M0 304 q50 -14 100 0 t100 0 t100 0 t100 0 V320 H0 Z" fill="#1478A0" opacity="0.10"/>`;
}

function bubbles(x, y, n = 4) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = 2.5 + (i % 3) * 1.6;
    out += `<circle cx="${x + i * 9 - 6}" cy="${y - i * 12}" r="${r}" fill="#FFFFFF" opacity="${0.5 - i * 0.08}"/>`;
  }
  return out;
}

/* جهاز تناضح عكسي منزلي */
function artRO(id, stages = 7) {
  const n = Math.min(Math.max(stages || 7, 3), 7);
  let housings = '';
  const startX = 200 - (n * 26) / 2;
  for (let i = 0; i < n; i++) {
    const x = startX + i * 26;
    const isMembrane = i === Math.floor(n / 2);
    const fill = isMembrane ? `url(#${id}-blue)` : `url(#${id}-body)`;
    housings += `
      <g>
        <rect x="${x}" y="126" width="20" height="112" rx="10" fill="${fill}" stroke="#9FB4C4" stroke-width="1.4"/>
        <rect x="${x + 3}" y="132" width="5" height="94" rx="2.5" fill="#FFFFFF" opacity="${isMembrane ? 0.28 : 0.75}"/>
        <rect x="${x - 1}" y="118" width="22" height="12" rx="4" fill="url(#${id}-steel)"/>
      </g>`;
  }
  const tankX = startX + n * 26 + 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="جهاز تحلية منزلي ${n} مراحل">
  ${bg(id)}
  <!-- الخزان -->
  <g>
    <rect x="${tankX}" y="128" width="62" height="110" rx="14" fill="url(#${id}-body)" stroke="#9FB4C4" stroke-width="1.6"/>
    <rect x="${tankX + 8}" y="140" width="14" height="86" rx="7" fill="#FFFFFF" opacity="0.7"/>
    <rect x="${tankX + 22}" y="116" width="18" height="16" rx="4" fill="url(#${id}-steel)"/>
    <text x="${tankX + 31}" y="200" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#1478A0">12L</text>
  </g>
  <!-- الهيكل العلوي -->
  <rect x="${startX - 12}" y="96" width="${n * 26 + 12}" height="26" rx="8" fill="url(#${id}-steel)" opacity="0.85"/>
  ${housings}
  <!-- الصنبور -->
  <g>
    <rect x="70" y="150" width="12" height="88" rx="6" fill="url(#${id}-steel)"/>
    <path d="M76 152 q0 -26 26 -26 h16" fill="none" stroke="url(#${id}-steel)" stroke-width="12" stroke-linecap="round"/>
    <circle cx="76" cy="146" r="9" fill="url(#${id}-gold)"/>
    <path d="M118 128 q6 14 0 26" fill="none" stroke="#2FB6D8" stroke-width="4" stroke-linecap="round" opacity="0.85"/>
    ${bubbles(120, 152, 3)}
  </g>
  <!-- شريط المراحل -->
  <g>
    <rect x="46" y="256" width="308" height="30" rx="15" fill="#073B57" opacity="0.9"/>
    <text x="200" y="276" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="14" font-weight="700" fill="#FFFFFF">تنقية على ${n} مراحل · تناضح عكسي RO</text>
  </g>
</svg>`;
}

/* محطة تجارية للمقاهي والمطاعم */
function artCommercial(id, label = '200 GPD') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="محطة تحلية للمقاهي والمطاعم">
  ${bg(id)}
  <!-- إطار ستانلس -->
  <g>
    <rect x="86" y="72" width="228" height="180" rx="12" fill="none" stroke="url(#${id}-steel)" stroke-width="9"/>
    <rect x="96" y="82" width="208" height="160" rx="8" fill="#FFFFFF" opacity="0.55"/>
    <!-- أغشية أفقية -->
    ${[0, 1, 2].map(i => `
      <rect x="112" y="${98 + i * 30}" width="120" height="22" rx="11" fill="url(#${id}-blue)" stroke="#0A5C82" stroke-width="1"/>
      <rect x="118" y="${103 + i * 30}" width="100" height="5" rx="2.5" fill="#FFFFFF" opacity="0.35"/>
      <rect x="236" y="${101 + i * 30}" width="14" height="16" rx="3" fill="url(#${id}-steel)"/>`).join('')}
    <!-- مضخة -->
    <circle cx="276" cy="118" r="20" fill="url(#${id}-steel)" stroke="#7E93A5" stroke-width="1.5"/>
    <circle cx="276" cy="118" r="9" fill="#073B57"/>
    <circle cx="276" cy="118" r="3.5" fill="#E8A33D"/>
    <!-- عدادات -->
    <circle cx="126" cy="212" r="17" fill="#FFFFFF" stroke="#9FB4C4" stroke-width="2"/>
    <path d="M126 212 L136 204" stroke="#E8A33D" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="170" cy="212" r="17" fill="#FFFFFF" stroke="#9FB4C4" stroke-width="2"/>
    <path d="M170 212 L162 202" stroke="#2FB6D8" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="198" y="196" width="96" height="32" rx="6" fill="#073B57"/>
    <text x="246" y="217" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#47D6D2">TDS 12</text>
  </g>
  <!-- تدفق الماء -->
  <path d="M60 150 h22 M318 150 h22" stroke="#2FB6D8" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
  ${bubbles(332, 142, 3)}
  <rect x="60" y="266" width="280" height="30" rx="15" fill="#073B57" opacity="0.9"/>
  <text x="200" y="286" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="14" font-weight="700" fill="#FFFFFF">محطة ${esc(label)} · للمقاهي والمطاعم</text>
</svg>`;
}

/* فلتر خاص بماكينة القهوة */
function artCafe(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="فلتر لمعدات المقاهي">
  ${bg(id)}
  <!-- كأس فلتر عمودي -->
  <g>
    <rect x="168" y="66" width="64" height="26" rx="7" fill="url(#${id}-steel)"/>
    <rect x="174" y="90" width="52" height="150" rx="14" fill="url(#${id}-body)" stroke="#9FB4C4" stroke-width="1.6"/>
    <rect x="182" y="100" width="12" height="128" rx="6" fill="#FFFFFF" opacity="0.8"/>
    <rect x="174" y="150" width="52" height="90" rx="14" fill="url(#${id}-blue)" opacity="0.85"/>
    <path d="M176 158 q24 -10 48 0" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.5"/>
  </g>
  <!-- فنجان قهوة -->
  <g transform="translate(252,178)">
    <path d="M0 0 h64 l-7 46 a12 12 0 0 1 -12 10 H19 a12 12 0 0 1 -12 -10 Z" fill="#FFFFFF" stroke="#B9CBD8" stroke-width="2"/>
    <path d="M64 10 h12 a14 14 0 0 1 0 28 h-9" fill="none" stroke="#B9CBD8" stroke-width="6"/>
    <path d="M8 14 h48 l-3 20 H11 Z" fill="#6B4423" opacity="0.75"/>
    <path d="M20 -14 q6 -8 0 -16 M36 -14 q6 -8 0 -16" fill="none" stroke="#8FA6B8" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
  </g>
  <!-- قطرات -->
  ${bubbles(150, 120, 4)}
  <rect x="60" y="266" width="280" height="30" rx="15" fill="#073B57" opacity="0.9"/>
  <text x="200" y="286" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="14" font-weight="700" fill="#FFFFFF">حماية معدات القهوة والثلج</text>
</svg>`;
}

/* برادة */
function artCooler(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="برادة مياه">
  ${bg(id)}
  <g>
    <rect x="146" y="52" width="108" height="200" rx="16" fill="url(#${id}-body)" stroke="#9FB4C4" stroke-width="2"/>
    <rect x="156" y="62" width="88" height="52" rx="9" fill="#0E2233"/>
    <rect x="164" y="72" width="46" height="8" rx="4" fill="#47D6D2" opacity="0.9"/>
    <rect x="164" y="88" width="30" height="6" rx="3" fill="#E8A33D" opacity="0.8"/>
    <text x="230" y="94" text-anchor="end" font-family="Arial" font-size="16" font-weight="700" fill="#47D6D2">5°C</text>
    <!-- الصنابير -->
    <g>
      <rect x="170" y="132" width="16" height="20" rx="4" fill="#2FB6D8"/>
      <rect x="192" y="132" width="16" height="20" rx="4" fill="#0A5C82"/>
      <rect x="214" y="132" width="16" height="20" rx="4" fill="#E05B4C"/>
      <path d="M178 156 v10 M200 156 v10 M222 156 v10" stroke="#8FA6B8" stroke-width="4" stroke-linecap="round"/>
    </g>
    <!-- منطقة التنقيط -->
    <rect x="164" y="176" width="72" height="12" rx="4" fill="url(#${id}-steel)"/>
    <!-- باب سفلي -->
    <rect x="158" y="198" width="84" height="44" rx="8" fill="#FFFFFF" stroke="#C9D8E4" stroke-width="1.6"/>
    <circle cx="232" cy="220" r="4" fill="#8FA6B8"/>
    <!-- قدم -->
    <rect x="160" y="252" width="80" height="8" rx="4" fill="#8FA6B8"/>
  </g>
  <!-- كوب + تدفق -->
  <g transform="translate(272,196)">
    <path d="M0 0 h34 l-4 34 a7 7 0 0 1 -7 6 H11 a7 7 0 0 1 -7 -6 Z" fill="#FFFFFF" stroke="#B9CBD8" stroke-width="2"/>
    <path d="M5 12 h24 l-2 18 H7 Z" fill="#2FB6D8" opacity="0.55"/>
  </g>
  <path d="M200 168 q4 16 -4 30" fill="none" stroke="#2FB6D8" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
  ${bubbles(120, 130, 4)}
  <rect x="60" y="272" width="280" height="28" rx="14" fill="#073B57" opacity="0.9"/>
  <text x="200" y="291" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="13.5" font-weight="700" fill="#FFFFFF">بارد · بارد جداً · حار</text>
</svg>`;
}

/* برادة سبيل كبيرة */
function artSabeel(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="برادة سبيل">
  ${bg(id)}
  <g>
    <rect x="98" y="58" width="204" height="196" rx="14" fill="url(#${id}-steel)" stroke="#7E93A5" stroke-width="2"/>
    <rect x="112" y="72" width="176" height="44" rx="8" fill="#073B57"/>
    <text x="200" y="101" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="19" font-weight="800" fill="#F5C86B">سبيل</text>
    ${[0, 1, 2, 3].map(i => `
      <circle cx="${140 + i * 40}" cy="152" r="11" fill="${i === 3 ? '#E05B4C' : '#2FB6D8'}"/>
      <path d="M${140 + i * 40} 164 v12" stroke="#7E93A5" stroke-width="5" stroke-linecap="round"/>`).join('')}
    <rect x="120" y="186" width="160" height="14" rx="5" fill="#E7EFF5" stroke="#9FB4C4" stroke-width="1.4"/>
    <rect x="120" y="210" width="160" height="34" rx="7" fill="#FFFFFF" opacity="0.6"/>
  </g>
  <!-- فلتر مرفق -->
  <g transform="translate(312,150)">
    <rect x="0" y="0" width="34" height="80" rx="10" fill="url(#${id}-body)" stroke="#9FB4C4" stroke-width="1.6"/>
    <rect x="6" y="34" width="22" height="40" rx="8" fill="url(#${id}-blue)" opacity="0.8"/>
    <rect x="-2" y="-8" width="38" height="10" rx="4" fill="url(#${id}-steel)"/>
  </g>
  ${bubbles(84, 140, 3)}
  <rect x="52" y="268" width="296" height="30" rx="15" fill="#073B57" opacity="0.9"/>
  <text x="200" y="288" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="13.5" font-weight="700" fill="#FFFFFF">للمساجد والاستراحات · مع فلتر 7 مراحل</text>
</svg>`;
}

/* شمعات / قطع غيار */
function artCartridge(id, n = 3) {
  const cols = ['#2FB6D8', '#F5F1E6', '#3C3A36'];
  const start = 200 - (n * 46) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="شمعات وقطع غيار">
  ${bg(id)}
  ${Array.from({ length: n }).map((_, i) => `
    <g transform="translate(${start + i * 46},0)">
      <rect x="0" y="86" width="34" height="150" rx="9" fill="${cols[i % 3]}" stroke="#8FA6B8" stroke-width="1.6"/>
      <rect x="5" y="96" width="8" height="130" rx="4" fill="#FFFFFF" opacity="0.45"/>
      <rect x="-3" y="76" width="40" height="14" rx="5" fill="url(#${id}-steel)"/>
      <rect x="-3" y="232" width="40" height="14" rx="5" fill="url(#${id}-steel)"/>
    </g>`).join('')}
  <!-- غشاء صغير -->
  <g transform="translate(${start + n * 46 + 16},116)">
    <rect x="0" y="0" width="86" height="34" rx="17" fill="url(#${id}-blue)" stroke="#0A5C82" stroke-width="1.2"/>
    <rect x="8" y="8" width="66" height="6" rx="3" fill="#FFFFFF" opacity="0.35"/>
    <rect x="86" y="6" width="16" height="22" rx="4" fill="url(#${id}-steel)"/>
  </g>
  ${bubbles(70, 120, 4)}
  <rect x="60" y="266" width="280" height="30" rx="15" fill="#073B57" opacity="0.9"/>
  <text x="200" y="286" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="14" font-weight="700" fill="#FFFFFF">قطع غيار أصلية لجميع الماركات</text>
</svg>`;
}

/* ممبرين */
function artMembrane(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="غشاء تناضح عكسي">
  ${bg(id)}
  <g transform="rotate(-12 200 165)">
    <rect x="96" y="120" width="208" height="76" rx="38" fill="url(#${id}-blue)" stroke="#0A5C82" stroke-width="2"/>
    <rect x="112" y="136" width="176" height="12" rx="6" fill="#FFFFFF" opacity="0.3"/>
    <rect x="112" y="158" width="176" height="8" rx="4" fill="#FFFFFF" opacity="0.18"/>
    <rect x="70" y="140" width="34" height="36" rx="8" fill="url(#${id}-steel)"/>
    <rect x="296" y="140" width="34" height="36" rx="8" fill="url(#${id}-steel)"/>
    <circle cx="87" cy="158" r="7" fill="#073B57"/>
    <circle cx="313" cy="158" r="7" fill="#073B57"/>
  </g>
  <!-- جزيئات تُرفض -->
  ${[[128, 92, '#E05B4C'], [168, 74, '#E05B4C'], [214, 66, '#E8A33D'], [258, 78, '#E05B4C']].map(([x, y, c]) =>
    `<circle cx="${x}" cy="${y}" r="6" fill="${c}" opacity="0.8"/>`).join('')}
  <path d="M120 100 q80 -34 160 4" fill="none" stroke="#E05B4C" stroke-width="2.4" stroke-dasharray="6 6" opacity="0.6"/>
  <!-- قطرات نقية -->
  ${bubbles(186, 250, 4)}
  <rect x="60" y="268" width="280" height="28" rx="14" fill="#073B57" opacity="0.9"/>
  <text x="200" y="287" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="13.5" font-weight="700" fill="#FFFFFF">إزالة حتى 99% من الأملاح الذائبة</text>
</svg>`;
}

/* مضخة */
function artPump(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="مضخة ضغط">
  ${bg(id)}
  <g transform="translate(200,160)">
    <rect x="-86" y="-34" width="172" height="68" rx="20" fill="url(#${id}-steel)" stroke="#7E93A5" stroke-width="2"/>
    <circle cx="0" cy="0" r="46" fill="#0E2233"/>
    <circle cx="0" cy="0" r="34" fill="url(#${id}-blue)"/>
    ${[0, 60, 120, 180, 240, 300].map(a =>
      `<rect x="-4" y="-30" width="8" height="22" rx="4" fill="#FFFFFF" opacity="0.75" transform="rotate(${a})"/>`).join('')}
    <circle cx="0" cy="0" r="9" fill="#E8A33D"/>
    <rect x="-104" y="-14" width="24" height="28" rx="6" fill="#8FA6B8"/>
    <rect x="80" y="-14" width="24" height="28" rx="6" fill="#8FA6B8"/>
  </g>
  <path d="M64 160 h22 M314 160 h22" stroke="#2FB6D8" stroke-width="6" stroke-linecap="round" opacity="0.65"/>
  ${bubbles(340, 148, 3)}
  <rect x="60" y="262" width="280" height="30" rx="15" fill="#073B57" opacity="0.9"/>
  <text x="200" y="282" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="14" font-weight="700" fill="#FFFFFF">مضخة هادئة · ضمان سنة</text>
</svg>`;
}

/* محطة مركزية / خزان */
function artCentral(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="محطة مركزية">
  ${bg(id)}
  <!-- خزانا فيبر جلاس -->
  ${[[108, '#1E6E8C'], [188, '#2A86A6']].map(([x, c], i) => `
    <g>
      <rect x="${x}" y="86" width="70" height="150" rx="35" fill="${c}" stroke="#0A4C68" stroke-width="2"/>
      <ellipse cx="${x + 35}" cy="88" rx="35" ry="12" fill="${i ? '#47D6D2' : '#2FB6D8'}"/>
      <rect x="${x + 12}" y="110" width="12" height="112" rx="6" fill="#FFFFFF" opacity="0.22"/>
      <rect x="${x + 26}" y="70" width="18" height="18" rx="4" fill="url(#${id}-steel)"/>
    </g>`).join('')}
  <!-- لوحة تحكم -->
  <g transform="translate(276,132)">
    <rect x="0" y="0" width="72" height="66" rx="9" fill="#0E2233"/>
    <rect x="9" y="9" width="54" height="24" rx="4" fill="#0A3B4E"/>
    <text x="36" y="26" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#47D6D2">AUTO</text>
    <circle cx="18" cy="48" r="6" fill="#47D6D2"/>
    <circle cx="36" cy="48" r="6" fill="#E8A33D"/>
    <circle cx="54" cy="48" r="6" fill="#3DDC84"/>
  </g>
  <!-- أنابيب -->
  <path d="M96 236 h220" stroke="url(#${id}-steel)" stroke-width="10" stroke-linecap="round"/>
  <path d="M96 250 h220" stroke="#2FB6D8" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
  ${bubbles(84, 120, 4)}
  <rect x="52" y="270" width="296" height="30" rx="15" fill="#073B57" opacity="0.92"/>
  <text x="200" y="290" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="13.5" font-weight="700" fill="#FFFFFF">محطة مركزية · معاينة وتصميم حسب الطلب</text>
</svg>`;
}

/* فلتر جامبو */
function artJumbo(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="فلتر جامبو للخزانات">
  ${bg(id)}
  ${[0, 1, 2].map(i => `
    <g transform="translate(${118 + i * 62},0)">
      <rect x="0" y="80" width="48" height="164" rx="12" fill="url(#${id}-body)" stroke="#9FB4C4" stroke-width="2"/>
      <rect x="8" y="92" width="12" height="140" rx="6" fill="#FFFFFF" opacity="0.85"/>
      <rect x="-4" y="66" width="56" height="18" rx="6" fill="url(#${id}-steel)"/>
      <rect x="-4" y="240" width="56" height="18" rx="6" fill="url(#${id}-steel)"/>
      <rect x="6" y="150" width="36" height="70" rx="8" fill="${['#2FB6D8', '#F5F1E6', '#3C3A36'][i]}" opacity="0.85"/>
    </g>`).join('')}
  <path d="M92 148 h18 M300 148 h18" stroke="#2FB6D8" stroke-width="7" stroke-linecap="round" opacity="0.6"/>
  ${bubbles(322, 132, 3)}
  <rect x="52" y="272" width="296" height="28" rx="14" fill="#073B57" opacity="0.9"/>
  <text x="200" y="291" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="13.5" font-weight="700" fill="#FFFFFF">يُرَكَّب على الخط الرئيسي قبل الخزان</text>
</svg>`;
}

/* باقة (جهاز + برادة) */
function artBundle(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="باقة جهاز وبرادة">
  ${bg(id)}
  <!-- جهاز مبسّط -->
  <g transform="translate(46,84)">
    <rect x="0" y="18" width="150" height="18" rx="6" fill="url(#${id}-steel)" opacity="0.9"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${10 + i * 26}" y="38" width="18" height="96" rx="9" fill="${i === 2 ? `url(#${id}-blue)` : `url(#${id}-body)`}" stroke="#9FB4C4" stroke-width="1.4"/>`).join('')}
    <rect x="10" y="138" width="130" height="10" rx="5" fill="#B9CBD8" opacity="0.7"/>
  </g>
  <!-- برادة مبسّطة -->
  <g transform="translate(232,66)">
    <rect x="0" y="0" width="86" height="172" rx="14" fill="url(#${id}-body)" stroke="#9FB4C4" stroke-width="2"/>
    <rect x="9" y="10" width="68" height="40" rx="8" fill="#0E2233"/>
    <text x="62" y="36" text-anchor="end" font-family="Arial" font-size="14" font-weight="700" fill="#47D6D2">5°C</text>
    <rect x="16" y="66" width="14" height="17" rx="4" fill="#2FB6D8"/>
    <rect x="36" y="66" width="14" height="17" rx="4" fill="#0A5C82"/>
    <rect x="56" y="66" width="14" height="17" rx="4" fill="#E05B4C"/>
    <rect x="14" y="98" width="58" height="11" rx="4" fill="url(#${id}-steel)"/>
    <rect x="12" y="120" width="62" height="36" rx="7" fill="#FFFFFF" stroke="#C9D8E4" stroke-width="1.6"/>
  </g>
  ${bubbles(206, 120, 4)}
  <rect x="46" y="268" width="308" height="32" rx="16" fill="url(#${id}-gold)"/>
  <text x="200" y="290" text-anchor="middle" font-family="'Segoe UI',Tahoma,Arial" font-size="14.5" font-weight="800" fill="#3A2607">باقة كاملة · تركيب الاثنين مجاناً</text>
</svg>`;
}

const ART = {
  ro: artRO, home: artRO, commercial: artCommercial, cafe: artCafe,
  cooler: artCooler, sabeel: artSabeel, cartridge: artCartridge,
  membrane: artMembrane, pump: artPump, central: artCentral,
  jumbo: artJumbo, bundle: artBundle
};

function productArt(product, uid) {
  const id = 'a' + String(uid || product.id || Math.random().toString(36).slice(2, 7)).replace(/[^a-zA-Z0-9]/g, '');
  const fn = ART[product.type] || ART[product.category] || artRO;
  let svg;
  if (fn === artRO) svg = artRO(id, product.stages || 7);
  else if (fn === artCommercial) svg = artCommercial(id, (product.output || '').replace('لتر/يوم', 'ل/ي') || '');
  else if (fn === artCartridge) svg = artCartridge(id, product.stages && product.stages > 0 && product.stages < 8 ? Math.min(product.stages, 3) : 3);
  else svg = fn(id);
  return svg;
}

module.exports = { productArt, PALETTE, esc };
