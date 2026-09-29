const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const request = require('supertest');
const { AppDataSource: db } = require('../src/data-source');
const { Order } = require('../src/entities/order.entity');
const { OrderHistory, CancelledOrderArchive } = require('../src/entities/cancelled-order.entity');
const auth = require('../src/middlewares/auth.middleware');
const { RBACService } = require('../src/services/rbac.service');
const mail = require('../src/utils/email');
const originals = { auth: auth.authenticate, permission: RBACService.hasPermission, repo: db.getRepository.bind(db), transaction: db.transaction, mail: mail.sendEmail };
let orders, histories, archives, granted, failHistory, failMail, sent, inTransaction, queries;
const actor = randomUUID();
auth.authenticate = (req, res, next) => {
  if (!req.get('x-role')) return res.status(401).json({ message: 'Unauthorized' });
  req.user = { id: actor, userRole: req.get('x-role') }; next();
};
RBACService.hasPermission = async (_id, resource, action) => resource === 'cancelled-order' && granted.includes(action);
mail.sendEmail = async args => { assert.equal(inTransaction, false); if (failMail) throw Error('provider failure'); sent.push(args); };
const service = require('../src/services/cancelled-order.service');
const app = express(); app.use(express.json()); app.use('/api/cancelled-orders', require('../src/routes/cancelled-order.routes').default);
const base = '/api/cancelled-orders', api = request(app);
const call = (method, path = base, role = 'su') => api[method](path).set('x-role', role);
const payload = extra => ({ status: 'cancelled', override: false, notifyCustomer: false, ...extra });
const seed = (extra = {}) => {
  const row = { id: randomUUID(), status: 'cancelled', paymentStatus: 'cancelled', orderNumber: 'ORD-123', notes: 'Original', total: '100.00', createdAt: new Date(), updatedAt: new Date(), shippingAddress: { email: 'customer@example.test' }, user: { firstname: 'Jane', lastname: 'Doe', fullname: 'Jane Doe', email: 'customer@example.test', password: 'secret', refreshToken: 'secret' }, items: [{ id: randomUUID(), productId: randomUUID(), productName: 'Test', productImages: [], product: { model: 'MODEL' }, quantity: 1, total: '100.00', price: '100.00' }], inventoryReservations: ['secret'], transactionId: 'secret', ...extra };
  orders.set(row.id, structuredClone(row)); return row;
};
const orderRepo = {
  save: async row => { orders.set(row.id, structuredClone(row)); return row; },
  createQueryBuilder: alias => {
    const qb = originals.repo(Order).createQueryBuilder(alias);
    queries.push(qb);
    const visible = row => row.status === 'cancelled' && !archives.has(row.id);
    qb.getOne = async () => { const row = orders.get(qb.getParameters().id); if (inTransaction) assert.equal(qb.expressionMap.lockMode, 'pessimistic_write'); return row && visible(row) ? structuredClone(row) : null; };
    qb.getManyAndCount = async () => { const rows = [...orders.values()].filter(visible); return [rows.slice(qb.expressionMap.skip, qb.expressionMap.skip + qb.expressionMap.take), rows.length]; };
    return qb;
  },
};
const historyRepo = {
  create: row => row,
  save: async row => { if (failHistory) throw Error('history insert failed'); const saved = { ...row, id: randomUUID(), createdAt: new Date() }; histories.push(saved); return saved; },
  update: async (id, patch) => Object.assign(histories.find(h => h.id === id), patch),
  find: async options => { assert.deepEqual(options.order, { createdAt: 'DESC', id: 'DESC' }); return histories.filter(h => h.orderId === options.where.orderId).sort((a,b) => b.createdAt - a.createdAt); },
};
const archiveRepo = {
  create: row => row,
  findOneBy: async ({ orderId }) => archives.get(orderId) ?? null,
  save: async rows => { rows.forEach(row => archives.set(row.orderId, row)); return rows; },
};
const repository = entity => entity === Order ? orderRepo : entity === OrderHistory ? historyRepo : entity === CancelledOrderArchive ? archiveRepo : originals.repo(entity);
before(async () => {
  await db.buildMetadatas(); db.getRepository = repository;
  db.transaction = async cb => {
    const snapshot = structuredClone({ orders, histories, archives }); inTransaction = true;
    try { return await cb({ getRepository: repository }); }
    catch (error) { ({ orders, histories, archives } = snapshot); throw error; }
    finally { inTransaction = false; }
  };
});
beforeEach(() => { orders = new Map(); histories = []; archives = new Map(); granted = []; failHistory = false; failMail = false; sent = []; inTransaction = false; queries = []; });
after(() => { db.getRepository = originals.repo; db.transaction = originals.transaction; auth.authenticate = originals.auth; RBACService.hasPermission = originals.permission; mail.sendEmail = originals.mail; });

test('manual schema metadata and no database initialization', () => {
  assert.equal(db.isInitialized, false);
  assert.equal(db.getMetadata(OrderHistory).tableName, 'order_history');
  assert.equal(db.getMetadata(CancelledOrderArchive).foreignKeys[0].onDelete, 'RESTRICT');
});
test('authentication and every scoped permission', async () => {
  const row = seed();
  const routes = [['get', base, 'read'], ['get', `${base}/${row.id}`, 'read'], ['post', `${base}/${row.id}/history`, 'update'], ['delete', `${base}/bulk`, 'delete']];
  for (const [method, path, permission] of routes) {
    assert.equal((await api[method](path)).status, 401);
    granted = ['unrelated']; assert.equal((await call(method, path, 'admin')).status, 403);
    granted = [permission];
    const response = await call(method, path, 'admin').send(method === 'post' ? payload() : method === 'delete' ? { ids: [row.id] } : undefined);
    assert.equal(response.status, 200);
  }
});
test('listing excludes other statuses and archived rows, paginates and redacts', async () => {
  const row = seed(); seed({ status: 'pending' }); const archived = seed(); archives.set(archived.id, {}); seed();
  const response = await call('get').query({ page: 2, limit: 1 });
  assert.equal(response.status, 200); assert.deepEqual(response.body.meta, { page: 2, limit: 1, total: 2, totalPages: 2 });
  assert.equal(response.body.data.length, 1); assert.ok(!JSON.stringify(response.body).includes('secret'));
  const sql = queries[0].getQuery(); assert.match(sql, /NOT EXISTS/); assert.equal(queries[0].getParameters().cancelled, 'cancelled');
});
test('all filters and sorting generate parameterized SQL', () => {
  const { qb } = service.buildCancelledListQuery({ orderId: "O'R_%", customer: 'Jane', total: '12.34', dateAdded: '2026-09-29', dateModified: '2026-09-28', sortBy: 'total', sortOrder: 'ASC' });
  const [sql, params] = qb.getQueryAndParameters();
  assert.match(sql, /ILIKE/); assert.match(sql, /"o"\."total" = \$/); assert.match(sql, /INTERVAL '1 day'/); assert.match(sql, /ORDER BY "o"\."total" ASC/);
  assert.ok(!sql.includes("O'R")); assert.ok(params.includes("%O'R\\_\\%%")); assert.ok(params.includes('12.34')); assert.ok(params.includes('%Jane%')); assert.ok(params.includes('2026-09-29')); assert.ok(params.includes('2026-09-28'));
  for (const sortBy of ['orderNumber', 'customer', 'createdAt', 'updatedAt']) assert.doesNotThrow(() => service.buildCancelledListQuery({ sortBy }).qb.getQuery());
});
test('invalid filters, dates, IDs and request bodies return 400', async () => {
  for (const query of [{ page: '0' }, { limit: '101' }, { page: '1.5' }, { dateAdded: '2026-02-30' }, { dateModified: 'bad' }, { total: '1.234' }, { sortBy: 'password' }, { sortOrder: 'drop' }, { unknown: 'x' }, { customer: ['a', 'b'] }]) assert.throws(() => service.cancelledOrderQuery(query), e => e.status === 400);
  assert.equal((await call('get', `${base}/bad-id`)).status, 400);
  const row = seed();
  for (const body of [payload({ override: 'true' }), payload({ notifyCustomer: null }), payload({ status: 'invalid' }), payload({ comment: 'x'.repeat(10001) }), payload({ unknown: 1 }), {}]) assert.equal((await call('post', `${base}/${row.id}/history`).send(body)).status, 400);
});
test('detail provides items, tracking and newest history, never noncancelled orders', async () => {
  const row = seed(); histories.push({ id: 'old', orderId: row.id, createdAt: new Date(1) }, { id: 'new', orderId: row.id, createdAt: new Date(2) });
  const response = await call('get', `${base}/${row.id}`); assert.equal(response.status, 200);
  assert.equal(response.body.items[0].model, 'MODEL'); assert.deepEqual(response.body.tracking, { carrier: null, trackingNumber: null }); assert.equal(response.body.history[0].id, 'new'); assert.ok(!JSON.stringify(response.body).includes('secret'));
  for (const id of [randomUUID(), seed({ status: 'pending' }).id]) assert.equal((await call('get', `${base}/${id}`)).status, 404);
});
test('history updates notes and captures tracking without touching payments or inventory', async () => {
  const row = seed({ tracking: { carrier: 'Test', trackingNumber: '123' }, paymentStatus: 'completed' });
  const result = await service.addCancelledHistory(row.id, payload({ comment: 'Note', override: true }), actor);
  assert.equal(result.history.carrierName, 'Test'); assert.equal(result.history.createdBy, actor); assert.equal(result.history.override, true); assert.equal(result.notification, 'not_requested'); assert.equal(orders.get(row.id).notes, 'Note'); assert.equal(orders.get(row.id).paymentStatus, 'completed'); assert.deepEqual(orders.get(row.id).inventoryReservations, ['secret']);
  await service.addCancelledHistory(row.id, payload(), actor); assert.equal(orders.get(row.id).notes, 'Note');
});
test('all reopening/refund transitions rejected with or without override and for all payment states', async () => {
  for (const paymentStatus of ['pending', 'completed', 'processing', 'refunded']) {
    const row = seed({ paymentStatus });
    for (const override of [true, false]) for (const status of ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'refunded']) await assert.rejects(service.addCancelledHistory(row.id, payload({ override, status }), actor), e => e.status === 409);
    assert.equal(orders.get(row.id).status, 'cancelled');
  }
  assert.equal(histories.length, 0);
});
test('history insert failure rolls back notes; missing orders produce 404', async () => {
  const row = seed(); failHistory = true;
  await assert.rejects(service.addCancelledHistory(row.id, payload({ comment: 'Changed', notifyCustomer: true }), actor));
  assert.equal(orders.get(row.id).notes, 'Original'); assert.equal(sent.length, 0); assert.equal(histories.length, 0);
  await assert.rejects(service.addCancelledHistory(randomUUID(), payload(), actor), e => e.status === 404);
});
test('notification reflects provider success or failure and escapes HTML', async () => {
  const row = seed(); const result = await service.addCancelledHistory(row.id, payload({ notifyCustomer: true, comment: '<script>bad</script>' }), actor);
  assert.equal(result.history.customerNotified, true); assert.equal(result.notification, 'sent'); assert.equal(sent.length, 1); assert.ok(sent[0].html.includes('&lt;script&gt;'));
  failMail = true; const failed = await service.addCancelledHistory(row.id, payload({ notifyCustomer: true }), actor);
  assert.equal(failed.history.customerNotified, false); assert.equal(failed.notification, 'failed'); assert.match(failed.message, /notification failed/); assert.equal(histories.length, 2);
});
test('bulk archival is atomic and preserves paid/refunded orders and their history', async () => {
  const first = seed({ paymentStatus: 'completed' }), second = seed({ paymentStatus: 'refunded' }), active = seed({ status: 'confirmed' });
  for (const missing of [active.id, randomUUID()]) { await assert.rejects(service.archiveCancelledOrders({ ids: [first.id, missing] }, actor), e => e.status === 404); assert.equal(archives.size, 0); }
  const result = await service.archiveCancelledOrders({ ids: [first.id, second.id] }, actor);
  assert.equal(result.deletedCount, 2); assert.equal(result.deletionMode, 'archive'); assert.equal(orders.size, 3); assert.equal(orders.get(first.id).paymentStatus, 'completed');
  assert.equal((await call('get', `${base}/${first.id}`)).status, 404);
  await assert.rejects(service.addCancelledHistory(first.id, payload(), actor), e => e.status === 404);
});
test('bulk rejects malformed, duplicate, empty and excessive IDs', async () => {
  const row = seed();
  for (const ids of [[], ['bad'], [row.id, row.id.toUpperCase()], Array.from({ length: 101 }, randomUUID), null]) assert.equal((await call('delete', `${base}/bulk`).send({ ids })).status, 400);
  assert.equal(archives.size, 0);
});
test('notification audit persistence failure is explicit and missing recipient does not send', async () => {
  const missing = seed({ shippingAddress: {} });
  const result = await service.addCancelledHistory(missing.id, payload({ notifyCustomer: true }), actor);
  assert.equal(result.notification, 'failed'); assert.equal(sent.length, 0);
  const row = seed(), originalUpdate = historyRepo.update;
  historyRepo.update = async () => { throw Error('audit unavailable'); };
  try {
    await assert.rejects(service.addCancelledHistory(row.id, payload({ notifyCustomer: true }), actor), e => e.status === 500 && /email accepted/.test(e.message));
    assert.equal(sent.length, 1); assert.equal(histories.length, 2);
  } finally { historyRepo.update = originalUpdate; }
});
test('archive write failure rolls back the whole batch', async () => {
  const first = seed(), second = seed(), originalSave = archiveRepo.save;
  archiveRepo.save = async rows => { archives.set(rows[0].orderId, rows[0]); throw Error('archive insert failed'); };
  try {
    await assert.rejects(service.archiveCancelledOrders({ ids: [first.id, second.id] }, actor));
    assert.equal(archives.size, 0); assert.equal(orders.size, 2);
  } finally { archiveRepo.save = originalSave; }
});
