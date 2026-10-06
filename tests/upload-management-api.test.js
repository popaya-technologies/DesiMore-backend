const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const express = require('express');
const request = require('supertest');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'desimore-upload-tests-'));
const originalDirectory = process.env.UPLOAD_DIR;
process.env.UPLOAD_DIR = directory;
const auth = require('../src/middlewares/auth.middleware');
const { RBACService } = require('../src/services/rbac.service');
const originalAuth = auth.authenticate;
const originalPermission = RBACService.hasPermission;
let granted = [];
auth.authenticate = (req, res, next) => {
  if (!req.get('x-role')) return res.status(401).json({ message: 'Unauthorized' });
  req.user = { id: 'test', userRole: req.get('x-role') };
  next();
};
RBACService.hasPermission = async (_, resource, action) => resource === 'upload' && granted.includes(action);
const { uploadManagementService: service, uploadQuery } = require('../src/services/upload-management.service');
const app = express();
app.use(express.json());
app.use('/api/uploads', require('../src/routes/upload.routes').default);
app.use('/uploads', express.static(directory));
const api = request(app);
const call = (method, url = '/api/uploads', role = 'su') => api[method](url).set('x-role', role);
const create = (name = 'photo.png') => {
  const id = randomUUID() + '-' + name;
  fs.writeFileSync(path.join(directory, id), 'test image');
  return id;
};

beforeEach(() => {
  for (const entry of fs.readdirSync(directory)) fs.rmSync(path.join(directory, entry), { recursive: true, force: true });
  granted = [];
});
after(() => {
  auth.authenticate = originalAuth;
  RBACService.hasPermission = originalPermission;
  if (originalDirectory === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = originalDirectory;
  fs.rmSync(directory, { recursive: true, force: true });
});

test('lists real files with names, creation dates, row numbers, pagination and empty states', async () => {
  assert.deepEqual((await call('get')).body, { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  create('Alpha.png'); create('Beta.jpg'); create('extensionless');
  fs.writeFileSync(path.join(directory, 'unmanaged.txt'), 'excluded');
  fs.mkdirSync(path.join(directory, randomUUID() + '-directory.png'));
  const response = await call('get').query({ page: 2, limit: 2 });
  assert.equal(response.status, 200);
  assert.equal(response.body.meta.total, 3);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].no, 3);
  assert.ok(!response.body.data[0].name.includes(response.body.data[0].id.slice(0, 36)));
  assert.ok(Number.isFinite(Date.parse(response.body.data[0].createdAt)));
  assert.equal((await call('get').query({ page: 9 })).body.data.length, 0);
});

test('combines case-insensitive name and date filters', async () => {
  create('Alpha.png'); create('Beta.png');
  const date = new Date().toISOString().slice(0, 10);
  const result = await call('get').query({ name: 'ALPHA', date });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].name, 'Alpha.png');
  assert.equal((await call('get').query({ date: '2000-01-01' })).body.meta.total, 0);
  assert.equal((await call('get').query({ name: 'absent' })).body.meta.total, 0);
});

test('query validation rejects invalid dates, arrays, pagination and unknown filters', async () => {
  for (const query of [{ date: '2026-02-30' }, { date: 'bad' }, { page: '0' }, { page: '1.2' }, { limit: '101' }, { name: ['a','b'] }, { date: ['2026-01-01'] }, { unknown: 'x' }, { name: 'a'.repeat(256) }]) {
    assert.throws(() => uploadQuery(query), (error) => error.status === 400);
  }
  assert.equal((await call('get').query({ date: '2026-02-30' })).status, 400);
  assert.equal((await call('get').query({ limit: 101 })).status, 400);
});

test('authentication and read/delete permissions are independent', async () => {
  const id = create();
  assert.equal((await api.get('/api/uploads')).status, 401);
  assert.equal((await api.delete('/api/uploads/bulk').send({ ids: [id] })).status, 401);
  assert.equal((await call('get', '/api/uploads', 'customer')).status, 403);
  assert.equal((await call('delete', '/api/uploads/bulk', 'customer').send({ ids: [id] })).status, 403);
  granted = ['read'];
  assert.equal((await call('get', '/api/uploads', 'admin')).status, 200);
  assert.equal((await call('delete', '/api/uploads/bulk', 'admin').send({ ids: [id] })).status, 403);
  granted = ['delete'];
  assert.equal((await call('get', '/api/uploads', 'admin')).status, 403);
  assert.equal((await call('delete', '/api/uploads/bulk', 'admin').send({ ids: [id] })).status, 200);
});

test('bulk deletion removes files from list and public URLs, with recoverable quarantine', async () => {
  const ids = [create('one.png'), create('two.jpg')];
  assert.equal((await api.get('/uploads/' + ids[0])).status, 200);
  const result = await call('delete', '/api/uploads/bulk').send({ ids });
  assert.equal(result.status, 200);
  assert.equal(result.body.deletedCount, 2);
  assert.equal((await call('get')).body.meta.total, 0);
  assert.equal((await api.get('/uploads/' + ids[0])).status, 404);
  const deleted = fs.readdirSync(path.join(directory, '.admin-deleted'));
  assert.equal(deleted.length, 2);
  assert.equal((await api.get('/uploads/.admin-deleted/' + deleted[0])).status, 404);
});

test('invalid or missing batches leave all existing files unchanged', async () => {
  const id = create();
  for (const ids of [[], [id,id], ['../outside.png'], ['C:\\outside.png'], [randomUUID() + '-../file.png'], Array(101).fill(id)]) {
    assert.equal((await call('delete', '/api/uploads/bulk').send({ ids })).status, 400);
    assert.ok(fs.existsSync(path.join(directory, id)));
  }
  assert.equal((await call('delete', '/api/uploads/bulk').send({ ids: [id], extra: true })).status, 400);
  assert.equal((await call('delete', '/api/uploads/bulk').send({ ids: [id, randomUUID() + '-missing.png'] })).status, 404);
  assert.ok(fs.existsSync(path.join(directory, id)));
  assert.equal(fs.existsSync(path.join(directory, '.admin-deleted')), false);
});

test('moving failure rolls back earlier files in the batch', async () => {
  const ids = [create('one.png'), create('two.png')];
  const originalRename = fs.promises.rename;
  let calls = 0;
  fs.promises.rename = async (...args) => {
    if (++calls === 2) throw Object.assign(new Error('Simulated I/O failure'), { code: 'EACCES' });
    return originalRename(...args);
  };
  try { await assert.rejects(service.remove({ ids }), /Simulated I\/O failure/); }
  finally { fs.promises.rename = originalRename; }
  for (const id of ids) assert.ok(fs.existsSync(path.join(directory, id)));
  assert.equal(fs.readdirSync(path.join(directory, '.admin-deleted')).length, 0);
});

test('concurrent deletions cannot partially delete the same batch', async () => {
  const id = create();
  const results = await Promise.allSettled([service.remove({ ids: [id] }), service.remove({ ids: [id] })]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.status, 404);
});

test('existing image upload endpoints retain their response shapes', async () => {
  const single = await call('post', '/api/uploads/image').attach('image', Buffer.from('image'), { filename: 'new.png', contentType: 'image/png' });
  assert.equal(single.status, 201);
  assert.ok(single.body.url.startsWith('/uploads/'));
  const multiple = await call('post', '/api/uploads/images').attach('images', Buffer.from('image'), { filename: 'multi.png', contentType: 'image/png' });
  assert.equal(multiple.status, 201);
  assert.ok(Array.isArray(multiple.body));
  assert.equal((await call('get')).body.meta.total, 2);
});
