'use strict';
/* ===== مزامنة GitHub =====
   الاستضافة المجانية تمسح القرص عند الخمول/إعادة التشغيل.
   هذاModule ينسخ كل تعديل (بيانات/عملاء/صور/رمز الدخول) إلى مستودع خاص على GitHub،
   ويعيد تنزيله تلقائياً عند كل إقلاع — فما يضيع شي.
   يعمل فقط إذا توفرت GITHUB_TOKEN + GH_DATA_REPO في البيئة. */
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.GH_DATA_REPO || '';
const BRANCH = process.env.GH_DATA_BRANCH || 'main';
const ACTIVE = !!(TOKEN && REPO);
const ROOT = path.join(__dirname, '..');

function ghReq(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path: apiPath, method,
      headers: Object.assign({
        'User-Agent': 'furat-site-sync',
        'Accept': 'application/vnd.github+json',
        'Authorization': 'token ' + TOKEN,
        'X-GitHub-Api-Version': '2022-11-28'
      }, data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
    }, res => {
      let buf = '';
      res.on('data', c => (buf += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(buf); } catch (e) {}
        resolve({ status: res.statusCode, json, raw: buf });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
    if (data) req.write(data);
    req.end();
  });
}

async function pushFile(relPath, absPath) {
  if (!ACTIVE) return false;
  try {
    if (!fs.existsSync(absPath)) return false;
    const content = fs.readFileSync(absPath);
    const api = '/repos/' + REPO + '/contents/' + relPath;
    const cur = await ghReq('GET', api + '?ref=' + BRANCH + '&t=' + Date.now());
    const sha = cur.status === 200 && cur.json && cur.json.sha ? cur.json.sha : undefined;
    if (sha && Buffer.from(cur.json.content || '', 'base64').equals(content)) { lastPush = new Date().toISOString(); return true; } // لا تغيير
    const body = { message: 'تحديث بيانات: ' + relPath, content: content.toString('base64'), branch: BRANCH };
    if (sha) body.sha = sha;
    const put = await ghReq('PUT', api, body);
    if (put.status === 200 || put.status === 201) { lastPush = new Date().toISOString(); return true; }
    console.error('[ghsync] فشل الدفع', relPath, put.status, (put.raw || '').slice(0, 140));
    return false;
  } catch (e) {
    console.error('[ghsync] خطأ دفع', relPath, String((e && e.message) || e));
    return false;
  }
}

async function pullFile(relPath, absPath) {
  if (!ACTIVE) return false;
  try {
    const r = await ghReq('GET', '/repos/' + REPO + '/contents/' + relPath + '?ref=' + BRANCH + '&t=' + Date.now());
    if (r.status !== 200 || !r.json || !r.json.content) return false;
    const buf = Buffer.from(r.json.content, 'base64');
    if (relPath.endsWith('.json')) JSON.parse(buf.toString('utf8')); // تحقق قبل الكتابة
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, buf);
    return true;
  } catch (e) {
    console.error('[ghsync] خطأ سحب', relPath, String((e && e.message) || e));
    return false;
  }
}

async function pullDir(relDir, absDir) {
  if (!ACTIVE) return 0;
  try {
    const r = await ghReq('GET', '/repos/' + REPO + '/contents/' + relDir + '?ref=' + BRANCH + '&t=' + Date.now());
    if (r.status !== 200 || !Array.isArray(r.json)) return 0;
    let n = 0;
    fs.mkdirSync(absDir, { recursive: true });
    for (const f of r.json) {
      if (f.type !== 'file' || f.name === '.gitkeep') continue;
      const fr = await ghReq('GET', new URL(f.url).pathname + '?t=' + Date.now());
      if (fr.status === 200 && fr.json && fr.json.content) {
        fs.writeFileSync(path.join(absDir, f.name), Buffer.from(fr.json.content, 'base64'));
        n++;
      }
    }
    return n;
  } catch (e) {
    console.error('[ghsync] خطأ سحب مجلد', String((e && e.message) || e));
    return 0;
  }
}

/* دفع مؤجَّل: يجمع التعديلات السريعة المتتالية بدفعة واحدة */
const timers = {};
function backup(relPath, absPath) {
  if (!ACTIVE) return;
  clearTimeout(timers[relPath]);
  timers[relPath] = setTimeout(() => {
    pushFile(relPath, absPath).then(ok => { if (ok) console.log('[ghsync] نُسخ احتياطياً:', relPath); });
  }, 4000);
}

/* عند الإقلاع: استرجع أحدث البيانات من المستودع الخاص */
async function syncOnBoot(onDone) {
  if (!ACTIVE) {
    console.log('[ghsync] معطّل (لا يوجد GITHUB_TOKEN/GH_DATA_REPO)');
    if (onDone) onDone(false);
    return;
  }
  console.log('[ghsync] استرجاع البيانات من المستودع الخاص…');
  const a = await pullFile('data.json', path.join(ROOT, 'data.json'));
  const b = await pullFile('customers.json', path.join(ROOT, 'customers.json'));
  const c = await pullFile('admin-auth.json', path.join(ROOT, 'admin-auth.json'));
  const n = await pullDir('public/assets/uploads', path.join(ROOT, 'public', 'assets', 'uploads'));
  console.log('[ghsync] تم الاسترجاع:', JSON.stringify({ data: a, customers: b, auth: c, uploads: n }));
  if (onDone) onDone(true);
}

let lastPush = null;
function getLastPush() { return lastPush; }
module.exports = { ACTIVE, pushFile, pullFile, pullDir, backup, syncOnBoot, getLastPush };
