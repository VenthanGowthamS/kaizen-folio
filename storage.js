'use strict';
const fs = require('fs');
const path = require('path');

// Optional mirror of the data folder in a private Supabase Storage bucket, so the app can run on a host
// whose disk is wiped on every deploy (Render's free tier). The local disk stays the working copy:
//   - each upload is copied to the bucket before we answer "saved";
//   - a file missing locally is fetched back on demand;
//   - the SQLite database is snapshotted shortly after any change and restored on boot if the disk is empty.
// Without SUPABASE_URL and SUPABASE_SERVICE_KEY every method is a no-op, so local use and tests are unchanged.

const SNAPSHOT_DELAY_MS = 10_000;

function createStorage({ dataDir, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_KEY || '';
  const bucket = env.SUPABASE_BUCKET || 'kaizen-folio';
  const enabled = Boolean(base && key);
  const uploadDir = path.join(dataDir, 'uploads');
  const dbFile = path.join(dataDir, 'ankur.db');

  const url = (k) => `${base}/storage/v1/object/${bucket}/${k.split('/').map(encodeURIComponent).join('/')}`;
  const auth = { Authorization: `Bearer ${key}`, apikey: key };

  async function upload(k, body, contentType) {
    const res = await fetchImpl(url(k), { method: 'POST', headers: { ...auth, 'Content-Type': contentType, 'x-upsert': 'true' }, body });
    if (!res.ok) throw new Error(`Storage upload of ${k} failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
  // Resolves to a Buffer, or null when the object does not exist (Supabase answers 400 or 404 for that).
  async function download(k) {
    const res = await fetchImpl(url(k), { headers: auth });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const text = await res.text().catch(() => '');
    if (res.status === 404 || /not.?found/i.test(text)) return null;
    throw new Error(`Storage download of ${k} failed: ${res.status} ${text}`);
  }

  async function put(name) {
    if (!enabled) return;
    await upload(`uploads/${name}`, await fs.promises.readFile(path.join(uploadDir, name)), 'application/octet-stream');
  }
  async function ensureLocal(name) {
    if (!enabled) return;
    const file = path.join(uploadDir, name);
    if (fs.existsSync(file)) return;
    const data = await download(`uploads/${name}`);
    if (!data) return; // genuinely missing: the caller reports 404
    await fs.promises.mkdir(uploadDir, { recursive: true });
    await fs.promises.writeFile(file, data);
  }
  async function ensureLocalAll(names) {
    for (const n of names) await ensureLocal(n);
  }
  function remove(name) {
    if (!enabled) return;
    fetchImpl(url(`uploads/${name}`), { method: 'DELETE', headers: auth }).catch((err) => console.error('Storage delete failed:', err.message));
  }

  // On boot: if there is no local database, bring back the latest snapshot. A bucket with no snapshot means a
  // brand-new install. Any other failure must stop the boot: starting empty and then snapshotting would overwrite real data.
  async function restoreDb() {
    if (!enabled || fs.existsSync(dbFile)) return false;
    const data = await download('db/ankur.db');
    if (!data) return false;
    await fs.promises.mkdir(dataDir, { recursive: true });
    await fs.promises.writeFile(dbFile, data);
    console.log(`Restored the database from storage (${data.length} bytes).`);
    return true;
  }

  let timer = null;
  let running = null;
  let again = false;
  async function snapshot(db) {
    if (!enabled) return;
    const tmp = path.join(dataDir, 'snapshot.tmp.db');
    fs.rmSync(tmp, { force: true });
    try {
      db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
      const data = await fs.promises.readFile(tmp);
      await upload('db/ankur.db', data, 'application/octet-stream');
      await upload(`db/daily/${new Date().toISOString().slice(0, 10)}.db`, data, 'application/octet-stream'); // one backup per day
    } finally { fs.rmSync(tmp, { force: true }); }
  }
  // Debounced: a burst of edits becomes one snapshot a few seconds after the last one.
  function scheduleSnapshot(db) {
    if (!enabled) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (running) { again = true; return; }
      running = snapshot(db)
        .catch((err) => console.error('Database snapshot failed:', err.message))
        .finally(() => { running = null; if (again) { again = false; scheduleSnapshot(db); } });
    }, SNAPSHOT_DELAY_MS);
    timer.unref();
  }
  // Called on shutdown (Render sends SIGTERM before sleeping or redeploying): save anything pending now.
  async function flush(db) {
    if (!enabled) return;
    const pending = timer !== null || again;
    clearTimeout(timer);
    timer = null;
    again = false;
    if (running) await running;
    if (pending) await snapshot(db);
  }

  return { enabled, put, ensureLocal, ensureLocalAll, remove, restoreDb, snapshot, scheduleSnapshot, flush };
}

module.exports = { createStorage };
