'use strict';
/* ===== طبقة التخزين الموحدة =====
   وضعان تلقائيان بدون أي تغيير بالواجهات:
   1) ملفات محلية (الوضع الحالي الآمن) — كتابة ذرّية + .safe + لقطة
   2) MySQL على سيرفر المالك — تُفعّل بمجرد وجود db-config.json أو متغيرات DB_*
      وعندها القاعدة تحتفظ بكل شي عنده هو، ولا نسخة عندنا ولا عند أي خدمة خارجية.
   عند أول إقلاع بـ MySQL وبجداول فاضية: تُستورد الملفات الموجودة مرة واحدة تلقائيًا. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const CUST_PATH = path.join(ROOT, 'customers.json');
const DEFAULT_CUST = { cycles: { pre: 6, post: 12, membrane: 24 }, customers: [] };

let mode = 'file';
let pool = null;
const cache = { data: null, customers: null };

function readSafe(p, fallback) {
  const tries = [p, p + '.safe', p + '.bak'];
  for (const t of tries) {
    try { return JSON.parse(fs.readFileSync(t, 'utf8')); } catch (e) {}
  }
  return fallback;
}
function writeAtomic(p, obj) {
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, p);
  try { fs.copyFileSync(p, p + '.safe'); } catch (e) {}
}
function dbCfg() {
  try {
    const f = path.join(ROOT, 'db-config.json');
    if (fs.existsSync(f)) {
      const c = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (c && (c.database || c.url)) return c;
    }
  } catch (e) {}
  if (process.env.MYSQL_URL || process.env.DB_HOST) {
    return {
      url: process.env.MYSQL_URL || undefined,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || '',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || ''
    };
  }
  return null;
}

async function init() {
  const c = dbCfg();
  if (c) {
    try {
      const mysql = require('mysql2/promise');
      pool = mysql.createPool(c.url
        ? { uri: c.url, connectionLimit: 5, charset: 'utf8mb4' }
        : { host: c.host, port: c.port, user: c.user, password: c.password, database: c.database, connectionLimit: 5, charset: 'utf8mb4' });
      await pool.query('CREATE TABLE IF NOT EXISTS kv (name VARCHAR(64) PRIMARY KEY, doc LONGTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
      const [rows] = await pool.query('SELECT name, doc FROM kv');
      const map = {};
      (rows || []).forEach(r => { try { map[r.name] = JSON.parse(r.doc); } catch (e) {} });
      cache.data = map.data || null;
      cache.customers = map.customers || null;
      if (!cache.data) { cache.data = readSafe(DATA_PATH, null); if (cache.data) await persist('data', cache.data); }
      if (!cache.customers) { cache.customers = readSafe(CUST_PATH, null) || JSON.parse(JSON.stringify(DEFAULT_CUST)); await persist('customers', cache.customers); }
      if (!cache.data) throw new Error('لا مصدر بيانات متاح');
      mode = 'mysql';
      console.log('[store] وضع MySQL مفعّل — القاعدة تحفظ كل شي داخل سيرفر المالك');
      return;
    } catch (e) {
      console.error('[store] تعذّر الاتصال بـ MySQL، تراجع آمن للملفات:', e.message);
      try { if (pool) pool.end(); } catch (e2) {}
      pool = null; mode = 'file';
    }
  }
  cache.data = readSafe(DATA_PATH, null);
  cache.customers = readSafe(CUST_PATH, null) || JSON.parse(JSON.stringify(DEFAULT_CUST));
  mode = 'file';
}

async function persist(name, obj) {
  await pool.execute(
    'INSERT INTO kv (name, doc) VALUES (?, ?) ON DUPLICATE KEY UPDATE doc = VALUES(doc)',
    [name, JSON.stringify(obj)]
  );
}

/* قراءة متزامنة للواجهات (من الذاكرة، مع تحميل كسول للملف عند الحاجة) */
function getData() {
  if (!cache.data) cache.data = readSafe(DATA_PATH, null);
  return cache.data;
}
function getCustomers() {
  if (!cache.customers) cache.customers = readSafe(CUST_PATH, null) || JSON.parse(JSON.stringify(DEFAULT_CUST));
  return cache.customers;
}

async function saveData(obj) {
  cache.data = obj;
  if (mode === 'mysql' && pool) { await persist('data', obj); return; }
  writeAtomic(DATA_PATH, obj);
}
async function saveCustomers(obj) {
  cache.customers = obj;
  if (mode === 'mysql' && pool) { await persist('customers', obj); return; }
  writeAtomic(CUST_PATH, obj);
}

module.exports = {
  init, getData, getCustomers, saveData, saveCustomers,
  get mode() { return mode; },
  DATA_PATH, CUST_PATH
};
