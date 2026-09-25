'use strict';
/* ===== طبقة التخزين الموحدة =====
   ثلاثة أوضاع تلقائية بدون أي تغيير بالواجهات:
   1) MySQL على سيرفر المالك — فقط إذا وُجد db-config.json أو متغيرات DB_* (اختياري، له الأولوية)
   2) SQLite — الوضع الافتراضي الموصى به: ملف قاعدة واحد داخل backups/furat.db،
      بدون أي إعداد ولا سيرفر قاعدة ولا كلمات سر. كتابة ذرّية عبر معاملة SQLite.
   3) ملفات JSON — تراجع آمن تلقائي إذا تعذر أي مما سبق (لا يقع الموقع بحال).
   عند أول إقلاع بقاعدة فاضية: تُستورد البيانات الموجودة (data.json / customers.json) مرة واحدة تلقائيًا.
   كل البيانات تبقى داخل سيرفر المالك وحده — ولا نسخة عندنا ولا عند أي خدمة خارجية. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const CUST_PATH = path.join(ROOT, 'customers.json');
const DB_PATH = path.join(ROOT, 'backups', 'furat.db');
const DEFAULT_CUST = { cycles: { pre: 6, post: 12, membrane: 24 }, customers: [] };

let mode = 'file';
let pool = null;
let sdb = null;
let sdbUpsert = null;
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

function persistSqlite(name, obj) {
  sdbUpsert.run(name, JSON.stringify(obj));
}

async function initSqlite() {
  const Database = require('better-sqlite3');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  sdb = new Database(DB_PATH);
  try { sdb.pragma('journal_mode = WAL'); } catch (e) {}
  sdb.prepare("CREATE TABLE IF NOT EXISTS kv (name TEXT PRIMARY KEY, doc TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')))").run();
  sdbUpsert = sdb.prepare("INSERT INTO kv (name, doc, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(name) DO UPDATE SET doc = excluded.doc, updated_at = excluded.updated_at");
  const map = {};
  const rows = sdb.prepare('SELECT name, doc FROM kv').all();
  (rows || []).forEach(r => { try { map[r.name] = JSON.parse(r.doc); } catch (e) {} });
  cache.data = map.data || null;
  cache.customers = map.customers || null;
  if (!cache.data) { cache.data = readSafe(DATA_PATH, null); if (cache.data) persistSqlite('data', cache.data); }
  if (!cache.customers) { cache.customers = readSafe(CUST_PATH, null) || JSON.parse(JSON.stringify(DEFAULT_CUST)); persistSqlite('customers', cache.customers); }
  if (!cache.data) throw new Error('لا مصدر بيانات متاح');
  mode = 'sqlite';
  console.log('[store] وضع SQLite مفعّل — قاعدة البيانات ملف واحد داخل سيرفر المالك (backups/furat.db)');
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
      console.error('[store] تعذّر الاتصال بـ MySQL، سيُكمل الموقع آمنًا على التخزين المحلي:', e.message);
      try { if (pool) pool.end(); } catch (e2) {}
      pool = null;
    }
  }
  if (process.env.FH_FORCE_FILES !== '1') {
    try {
      await initSqlite();
      return;
    } catch (e) {
      console.error('[store] تعذّر تشغيل SQLite، تراجع آمن للملفات:', e.message);
      try { if (sdb) sdb.close(); } catch (e2) {}
      sdb = null; sdbUpsert = null;
    }
  }
  cache.data = readSafe(DATA_PATH, null);
  cache.customers = readSafe(CUST_PATH, null) || JSON.parse(JSON.stringify(DEFAULT_CUST));
  mode = 'file';
}

async function persist(name, obj) {
  if (mode === 'sqlite' && sdb) { persistSqlite(name, obj); return; }
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
  if (mode === 'sqlite' && sdb) { persistSqlite('data', obj); return; }
  if (mode === 'mysql' && pool) { await persist('data', obj); return; }
  writeAtomic(DATA_PATH, obj);
}
async function saveCustomers(obj) {
  cache.customers = obj;
  if (mode === 'sqlite' && sdb) { persistSqlite('customers', obj); return; }
  if (mode === 'mysql' && pool) { await persist('customers', obj); return; }
  writeAtomic(CUST_PATH, obj);
}

module.exports = {
  init, getData, getCustomers, saveData, saveCustomers,
  get mode() { return mode; },
  DATA_PATH, CUST_PATH, DB_PATH
};
