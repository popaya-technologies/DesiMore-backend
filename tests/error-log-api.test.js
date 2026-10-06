const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const request = require('supertest');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'desimore-error-log-tests-'));
const filename = path.join(directory, 'logs', 'error.log');
const originalFilename = process.env.ERROR_LOG_FILE;
process.env.ERROR_LOG_FILE = filename;
const auth = require('../src/middlewares/auth.middleware');
const { RBACService } = require('../src/services/rbac.service');
const originalAuth = auth.authenticate, originalPermission = RBACService.hasPermission;
let granted = [];
auth.authenticate = (req, res, next) => {
  if (!req.get('x-role')) return res.status(401).json({ message: 'Unauthorized' });
  req.user = { id: 'test', userRole: req.get('x-role') };
  next();
};
RBACService.hasPermission = async (_, resource, action) => resource === 'error-log' && granted.includes(action);
const { errorLogService: service, ErrorLogService, formatLogEntry, MAX_LOG_BYTES, VIEW_LOG_BYTES } = require('../src/services/error-log.service');
const { installErrorLogger } = require('../src/utils/error-logger');
const app = express();
app.use(express.json());
app.use('/api/error-logs', require('../src/routes/error-log.routes').default);
const api = request(app);
const base = '/api/error-logs';
const call = (method, url = base, role = 'su') => api[method](url).set('x-role', role);

beforeEach(async () => {
  await service.read();
  fs.rmSync(path.join(directory, 'logs'), { recursive: true, force: true });
  granted = [];
});
after(() => {
  auth.authenticate = originalAuth;
  RBACService.hasPermission = originalPermission;
  if (originalFilename === undefined) delete process.env.ERROR_LOG_FILE;
  else process.env.ERROR_LOG_FILE = originalFilename;
  fs.rmSync(directory, { recursive: true, force: true });
});

test('missing log is an empty state, not an error', async () => {
  const response = await call('get');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { content: '', size: 0, updatedAt: null, truncated: false });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
});

test('records timestamped errors and warnings persistently with stack traces', async () => {
  await service.append('ERROR', [new Error('Database operation failed')]);
  await service.append('WARN', ['Slow operation']);
  const response = await call('get');
  assert.equal(response.status, 200);
  assert.match(response.body.content, /\d{4}-\d{2}-\d{2}T.* - ERROR: Error: Database operation failed/);
  assert.match(response.body.content, /error-log-api.test.js/);
  assert.match(response.body.content, /WARN: Slow operation/);
  assert.ok(response.body.size > 0);
  assert.ok(Number.isFinite(Date.parse(response.body.updatedAt)));
  assert.equal((await new ErrorLogService(filename).read()).content, response.body.content);
});

test('download is a complete plain-text attachment and supports an empty log', async () => {
  assert.equal((await call('get', base + '/download')).text, '');
  await service.append('ERROR', ['A recorded failure']);
  const response = await call('get', base + '/download');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/plain/);
  assert.match(response.headers['content-disposition'], /attachment; filename="error-log-\d{4}-\d{2}-\d{2}\.log"/);
  assert.equal(response.text, (await service.read()).content);
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('clear requires confirmation, resets metadata, and accepts later errors', async () => {
  await service.append('ERROR', ['Before clear']);
  assert.equal((await call('delete').send({})).status, 400);
  assert.match((await service.read()).content, /Before clear/);
  const cleared = await call('delete').send({ confirm: 'CLEAR' });
  assert.equal(cleared.status, 200);
  assert.deepEqual(cleared.body, { content: '', size: 0, updatedAt: null, truncated: false });
  assert.equal(fs.statSync(filename).size, 0);
  await service.append('WARN', ['After clear']);
  assert.match((await service.read()).content, /After clear/);
  assert.doesNotMatch((await service.read()).content, /Before clear/);
});

test('read, download and clear enforce authentication and separate permissions', async () => {
  for (const [method, url] of [['get',base],['get',base+'/download'],['delete',base]]) {
    assert.equal((await api[method](url).send({confirm:'CLEAR'})).status, 401);
    assert.equal((await call(method,url,'customer').send({confirm:'CLEAR'})).status, 403);
  }
  granted=['read'];
  assert.equal((await call('get',base,'admin')).status,200);
  assert.equal((await call('get',base+'/download','admin')).status,200);
  assert.equal((await call('delete',base,'admin').send({confirm:'CLEAR'})).status,403);
  granted=['delete'];
  assert.equal((await call('get',base,'admin')).status,403);
  assert.equal((await call('delete',base,'admin').send({confirm:'CLEAR'})).status,200);
});

test('viewer is bounded and starts at a line boundary; download includes all retained entries', async () => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const content = 'first entry\n' + 'an existing line\n'.repeat(80000) + 'last entry\n';
  fs.writeFileSync(filename,content);
  const response=await call('get');
  assert.equal(response.body.truncated,true);
  assert.ok(Buffer.byteLength(response.body.content)<=VIEW_LOG_BYTES);
  assert.ok(response.body.content.startsWith('an existing line\n'));
  assert.ok(response.body.content.endsWith('last entry\n'));
  assert.equal((await call('get',base+'/download')).text,content);
});

test('retention and individual entries are bounded', async () => {
  fs.mkdirSync(path.dirname(filename), {recursive:true});
  fs.writeFileSync(filename,'old line\n'.repeat(Math.ceil(MAX_LOG_BYTES/9)));
  await service.append('ERROR',['newest entry']);
  assert.ok(fs.statSync(filename).size<=MAX_LOG_BYTES);
  assert.match(await service.download(),/newest entry/);
  const entry=formatLogEntry('ERROR',['large '.repeat(10000)]);
  assert.ok(Buffer.byteLength(entry)<=16*1024);
  assert.match(entry,/Entry truncated/);
});

test('sensitive structured keys, raw credential strings, bearer values and JWTs are redacted', () => {
  const circular={password:'hidden-password',nested:{accessToken:'hidden-access',safe:'visible'}};
  circular.self=circular;
  const entry=formatLogEntry('ERROR',[circular,'Bearer abc123','password="hidden raw"','eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoidGVzdCJ9.signature',new Error('api_key=hidden-key')]);
  for(const secret of ['hidden-password','hidden-access','abc123','hidden raw','eyJhbGciOiJIUzI1NiJ9','hidden-key']) assert.ok(!entry.includes(secret));
  assert.match(entry,/visible/);assert.match(entry,/Circular/);assert.match(entry,/REDACTED/);
});

test('console capture preserves output, records existing calls, and installs only once', async () => {
  const originalError=console.error,originalWarn=console.warn;
  const output=[];
  console.error=(...args)=>output.push(['error',...args]);
  console.warn=(...args)=>output.push(['warn',...args]);
  const restore=installErrorLogger(service);
  try {
    installErrorLogger(service);
    console.error('Captured error');console.warn('Captured warning');
    const content=(await service.read()).content;
    assert.equal(content.match(/Captured error/g).length,1);
    assert.match(content,/WARN: Captured warning/);
    assert.equal(output.length,2);
  } finally {restore();console.error=originalError;console.warn=originalWarn;}
});

test('concurrent append/clear operations preserve errors occurring after the clear', async () => {
  await Promise.all([service.append('ERROR',['old']),service.clear(),service.append('ERROR',['new'])]);
  const content=(await service.read()).content;
  assert.doesNotMatch(content,/ERROR: old/);
  assert.match(content,/ERROR: new/);
});

test('storage failures return controlled errors without leaking filesystem paths', async () => {
  fs.mkdirSync(filename,{recursive:true});
  for (const [method,url,body] of [['get',base],['get',base+'/download'],['delete',base,{confirm:'CLEAR'}]]) {
    const response=await call(method,url).send(body);
    assert.equal(response.status,500);
    assert.equal(response.body.message,'Could not access the error log');
    assert.ok(!JSON.stringify(response.body).includes(directory));
  }
});
