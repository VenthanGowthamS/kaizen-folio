'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createStorage } = require('../storage');

// An in-memory stand-in for Supabase Storage's object API.
function fakeSupabase({ failWith } = {}) {
  const objects = new Map();
  const fetchImpl = async (url, opts = {}) => {
    if (failWith) return new Response('boom', { status: failWith });
    const key = decodeURIComponent(new URL(url).pathname.replace('/storage/v1/object/kaizen-folio/', ''));
    const method = opts.method || 'GET';
    if (method === 'POST') { objects.set(key, Buffer.from(opts.body)); return new Response('{}', { status: 200 }); }
    if (method === 'DELETE') { objects.delete(key); return new Response('{}', { status: 200 }); }
    if (!objects.has(key)) return new Response('{"statusCode":"404","error":"not_found","message":"Object not found"}', { status: 400 });
    return new Response(objects.get(key), { status: 200 });
  };
  return { objects, fetchImpl };
}
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'k' };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kf-storage-'));

test('storage is a no-op without Supabase settings', async () => {
  const s = createStorage({ dataDir: tmp(), env: {} });
  assert.equal(s.enabled, false);
  await s.put('nothing.png');
  await s.ensureLocal('nothing.png');
  assert.equal(await s.restoreDb(), false);
});

test('an upload survives the disk being wiped', async () => {
  const sb = fakeSupabase();
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'uploads'));
  fs.writeFileSync(path.join(dir, 'uploads', 'a.png'), 'picture-bytes');
  const s = createStorage({ dataDir: dir, env, fetchImpl: sb.fetchImpl });
  await s.put('a.png');
  fs.rmSync(path.join(dir, 'uploads'), { recursive: true });
  await s.ensureLocal('a.png');
  assert.equal(fs.readFileSync(path.join(dir, 'uploads', 'a.png'), 'utf8'), 'picture-bytes');
  s.remove('a.png');
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(sb.objects.has('uploads/a.png'), false);
});

test('a missing file is left missing, not an error', async () => {
  const s = createStorage({ dataDir: tmp(), env, fetchImpl: fakeSupabase().fetchImpl });
  await s.ensureLocal('ghost.png');
});

test('the database comes back after a wipe, with a daily copy kept', async () => {
  const sb = fakeSupabase();
  const dir = tmp();
  const db = new DatabaseSync(path.join(dir, 'ankur.db'));
  db.exec("CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('her first medal')");
  const s = createStorage({ dataDir: dir, env, fetchImpl: sb.fetchImpl });
  await s.snapshot(db);
  assert.ok(sb.objects.has('db/ankur.db'));
  assert.ok([...sb.objects.keys()].some((k) => /^db\/daily\/\d{4}-\d{2}-\d{2}\.db$/.test(k)));
  assert.equal(fs.existsSync(path.join(dir, 'snapshot.tmp.db')), false);
  db.close();

  const fresh = tmp();
  const restored = await createStorage({ dataDir: fresh, env, fetchImpl: sb.fetchImpl }).restoreDb();
  assert.equal(restored, true);
  assert.equal(new DatabaseSync(path.join(fresh, 'ankur.db')).prepare('SELECT v FROM t').get().v, 'her first medal');
});

test('a brand-new install restores nothing; a storage outage stops the boot', async () => {
  assert.equal(await createStorage({ dataDir: tmp(), env, fetchImpl: fakeSupabase().fetchImpl }).restoreDb(), false);
  await assert.rejects(createStorage({ dataDir: tmp(), env, fetchImpl: fakeSupabase({ failWith: 500 }).fetchImpl }).restoreDb(), /download/);
});

test('an existing local database is never overwritten by a restore', async () => {
  const sb = fakeSupabase();
  sb.objects.set('db/ankur.db', Buffer.from('remote'));
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'ankur.db'), 'local');
  assert.equal(await createStorage({ dataDir: dir, env, fetchImpl: sb.fetchImpl }).restoreDb(), false);
  assert.equal(fs.readFileSync(path.join(dir, 'ankur.db'), 'utf8'), 'local');
});
