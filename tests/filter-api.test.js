// No database connections or schema changes: repository doubles and metadata only.
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const request = require("supertest");
const express = require("express");
const XLSX = require("xlsx");
const { AppDataSource: db } = require("../src/data-source");
const { FilterGroup } = require("../src/entities/filter.entity");
const { validateFilter, filterQuery } = require("../src/services/filter.service");
const auth = require("../src/middlewares/auth.middleware");
const { RBACService } = require("../src/services/rbac.service");
const originalAuth = auth.authenticate, originalPermission = RBACService.hasPermission;
const originalRepo = db.getRepository.bind(db), originalTransaction = db.transaction;
let rows = new Map(), duplicate = false, granted = [];
auth.authenticate = (req, res, next) => {
  if (!req.get("x-role")) return res.status(401).json({ message: "Unauthorized" });
  req.user = { id: "test", userRole: req.get("x-role"), permissions: granted.map(action => ({ resource: "filter", action })) };
  next();
};
RBACService.hasPermission = async (_id, resource, action) => resource === "filter" && granted.includes(action);
const app = express();
app.use(express.json());
app.use("/api/filters", require("../src/routes/filter.routes").default);
const api = request(app), base = "/api/filters";
const call = (method, path = base, role = "su") => api[method](path).set("x-role", role);
const payload = (extra = {}) => ({ name: "Color", values: [{ name: "Red" }, { name: "Blue", sortOrder: 2 }], ...extra });
const repo = {
  create: dto => ({ ...dto }),
  save: async row => {
    if (duplicate) throw { code: "23505" };
    const saved = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...row };
    rows.set(saved.id, structuredClone(saved)); return saved;
  },
  findOne: async ({ where: { id }, lock }) => {
    assert.equal(lock.mode, "pessimistic_write");
    return rows.has(id) ? structuredClone(rows.get(id)) : null;
  },
  findOneBy: async ({ id }) => rows.get(id) ?? null,
  delete: async id => ({ affected: rows.delete(id) ? 1 : 0 }),
  createQueryBuilder: alias => {
    const qb = originalRepo(FilterGroup).createQueryBuilder(alias);
    qb.getManyAndCount = async () => [[...rows.values()], rows.size];
    qb.getMany = async () => [...rows.values()];
    return qb;
  },
};
before(async () => {
  await db.buildMetadatas();
  db.getRepository = () => repo;
  db.transaction = async callback => {
    const snapshot = structuredClone(rows);
    try { return await callback({ getRepository: () => repo }); }
    catch (error) { rows = snapshot; throw error; }
  };
});
beforeEach(() => { rows.clear(); duplicate = false; granted = []; });
after(() => {
  db.getRepository = originalRepo; db.transaction = originalTransaction;
  auth.authenticate = originalAuth; RBACService.hasPermission = originalPermission;
});
test("entity agrees with manual SQL and tests never initialize a database", () => {
  const metadata = db.getMetadata(FilterGroup);
  assert.equal(metadata.tableName, "filter_groups");
  assert.equal(metadata.columns.find(c => c.propertyName === "values").type, "jsonb");
  const sql = require("fs").readFileSync("docs/filter-schema.sql", "utf8");
  assert(sql.includes('"values" JSONB')); assert(sql.includes("'filter:'"));
  assert.equal(db.isInitialized, false);
});
test("validation rejects invalid groups, nested values and duplicate rows", async () => {
  for (const body of [{}, null, [], payload({ name: "" }), payload({ sortOrder: "0" }),
    payload({ values: undefined }), payload({ values: [] }), payload({ values: null }),
    payload({ values: [null] }), payload({ extra: true }),
    payload({ values: [{ name: " " }] }), payload({ values: [{ name: "Red", sortOrder: -1 }] }),
    payload({ values: [{ name: "Red" }, { name: " red " }] }),
    payload({ values: [{ name: "Red", id: randomUUID() }] }),
    payload({ values: [{ name: "Red", image: "/uploads/a.jpg" }] }),
  ]) await assert.rejects(validateFilter(body, true), e => e.status === 400);
  const id = randomUUID();
  await assert.rejects(validateFilter({ values: [{ id, name: "A" }, { id, name: "B" }] }, false), e => e.status === 400);
});
test("authentication and action-specific permissions protect routes", async () => {
  assert.equal((await api.get(base)).status, 401);
  assert.equal((await call("get", base, "user")).status, 403);
  granted = ["create"];
  assert.equal((await call("post", base, "user").send(payload())).status, 201);
  assert.equal((await call("get", base, "user")).status, 403);
});
test("create defaults, sorted values, detail and default page size match the form", async () => {
  const result = await call("post").send(payload());
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const filter = result.body;
  assert.equal(filter.sortOrder, 0);
  assert.equal(filter.values[0].sortOrder, 0);
  assert(filter.values.every(v => v.id));
  assert.equal((await call("get", base + "/" + filter.id)).body.name, "Color");
  const list = await call("get");
  assert.equal(list.body.meta.total, 1); assert.equal(list.body.meta.limit, 20);
});
test("edits preserve omitted values and IDs and allow adding/removing/reordering rows", async () => {
  const filter = (await call("post").send(payload())).body;
  const path = base + "/" + filter.id;
  const scalar = await call("patch", path).send({ name: "Available Colors" });
  assert.equal(scalar.status, 200); assert.deepEqual(scalar.body.values, filter.values);
  const changed = await call("put", path).send({ values: [
    { id: filter.values[1].id, name: "Navy" },
    { name: "Green", sortOrder: 1 },
  ] });
  assert.equal(changed.status, 200); assert.equal(changed.body.name, "Available Colors");
  assert.equal(changed.body.values[0].name, "Green");
  assert.equal(changed.body.values[1].id, filter.values[1].id);
  assert.equal(changed.body.values[1].sortOrder, 2);
  assert(!changed.body.values.some(v => v.id === filter.values[0].id));
});
test("invalid row IDs and empty values never persist scalar changes", async () => {
  const filter = (await call("post").send(payload())).body;
  const path = base + "/" + filter.id;
  const invalid = await call("patch", path).send({ name: "Do not save",
    values: [{ id: randomUUID(), name: "Other" }] });
  assert.equal(invalid.status, 400); assert.equal(rows.get(filter.id).name, "Color");
  assert.equal((await call("patch", path).send({ name: "Do not save", values: [] })).status, 400);
  assert.equal(rows.get(filter.id).name, "Color");
});
test("duplicates, malformed IDs, missing records and deletion return expected status", async () => {
  duplicate = true;
  assert.equal((await call("post").send(payload())).status, 409);
  duplicate = false;
  assert.equal((await call("get", base + "/invalid")).status, 400);
  assert.equal((await call("get", base + "/" + randomUUID())).status, 404);
  assert.equal((await call("patch", base + "/" + randomUUID()).send({ name: "x" })).status, 404);
  const filter = (await call("post").send(payload())).body;
  assert.equal((await call("delete", base + "/" + filter.id)).status, 200);
  assert.equal(rows.size, 0);
  assert.equal((await call("delete", base + "/" + filter.id)).status, 404);
});
test("query builder binds search and dates and rejects invalid sorting/pagination", () => {
  const { qb, page, limit } = filterQuery({ search: "%_' OR true --",
    date: "2026-09-29", sortBy: "name", sortOrder: "DESC", page: "2", limit: "5" });
  const [sql, params] = qb.getQueryAndParameters();
  assert.equal(page, 2); assert.equal(limit, 5); assert(!sql.includes("OR true --"));
  assert(params.includes("%\\%\\_' OR true --%"));
  for (const query of [{ sortBy: "type" }, { date: "2026-02-30" }, { page: "0" }, { limit: "101" },
    { sortBy: "name;DROP TABLE users" }, { startDate: "2026-09-29", endDate: "2026-09-01" },
    { date: "2026-09-29", startDate: "2026-09-01" }])
    assert.throws(() => filterQuery(query), e => e.status === 400);
});
test("CSV/XLSX export uses list columns and escapes formulas", async () => {
  const filter = (await call("post").send(payload({ name: "=1+1" }))).body;
  const csv = await call("get", base + "/export").query({ format: "csv" });
  assert.equal(csv.status, 200); assert(csv.text.includes("'=1+1"));
  const xlsx = await call("get", base + "/export").query({ format: "xlsx" }).buffer(true)
    .parse((res, cb) => {
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  assert.equal(xlsx.status, 200);
  const book = XLSX.read(xlsx.body, { type: "buffer" });
  assert.equal(XLSX.utils.sheet_to_json(book.Sheets.Filters)[0]["Filter Group"], "'=1+1");
  assert.equal(rows.get(filter.id).name, "=1+1");
});
