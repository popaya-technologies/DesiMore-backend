// No database connections or schema changes: repository doubles and metadata only.
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const request = require("supertest");
const express = require("express");
const XLSX = require("xlsx");
const { AppDataSource: db } = require("../src/data-source");
const { CatalogOption } = require("../src/entities/option.entity");
const { validateOption, optionQuery } = require("../src/services/option.service");
const auth = require("../src/middlewares/auth.middleware");
const { RBACService } = require("../src/services/rbac.service");
const originalAuth = auth.authenticate, originalPermission = RBACService.hasPermission;
const originalRepo = db.getRepository.bind(db), originalTransaction = db.transaction;
let rows = new Map(), duplicate = false, granted = [];
auth.authenticate = (req, res, next) => {
  if (!req.get("x-role")) return res.status(401).json({ message: "Unauthorized" });
  req.user = { id: "test", userRole: req.get("x-role"), permissions: granted.map(action => ({ resource: "option", action })) };
  next();
};
RBACService.hasPermission = async (_id, resource, action) => resource === "option" && granted.includes(action);
const app = express();
app.use(express.json());
app.use("/api/options", require("../src/routes/option.routes").default);
const api = request(app), base = "/api/options";
const call = (method, path = base, role = "su") => api[method](path).set("x-role", role);
const payload = (extra = {}) => ({ name: "Color", values: [{ name: "Red" }, { name: "Blue", image: "/uploads/blue.jpg", sortOrder: 2 }], ...extra });
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
    const qb = originalRepo(CatalogOption).createQueryBuilder(alias);
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
test("entity matches manual SQL and no database is initialized", () => {
  const metadata = db.getMetadata(CatalogOption);
  assert.equal(metadata.tableName, "options");
  assert.equal(metadata.columns.find(c => c.propertyName === "type").default, "select");
  assert.equal(metadata.columns.find(c => c.propertyName === "values").type, "jsonb");
  const sql = require("fs").readFileSync("docs/option-schema.sql", "utf8");
  assert(sql.includes('"values" JSONB')); assert(sql.includes("option:"));
  assert.equal(db.isInitialized, false);
});
test("validation rejects malformed nested values and unsafe images", async () => {
  for (const body of [{}, null, [], payload({ name: "" }), payload({ sortOrder: "0" }),
    payload({ values: null }), payload({ values: [null] }), payload({ extra: true }),
    payload({ type: "Select" }), payload({ values: [{ name: " " }] }),
    payload({ values: [{ name: "Red" }, { name: " red " }] }),
    payload({ values: [{ name: "Red", image: "javascript:alert(1)" }] }),
    payload({ values: [{ name: "Red", image: "//evil.example/a.png" }] }),
    payload({ values: [{ name: "Red", image: "https://user:pass@example.com/a" }] }),
    payload({ values: [{ name: "Red", id: randomUUID() }] }),
  ]) await assert.rejects(validateOption(body, true), e => e.status === 400);
});
test("authentication and action-specific permissions protect routes", async () => {
  assert.equal((await api.get(base)).status, 401);
  assert.equal((await call("get", base, "user")).status, 403);
  granted = ["create"];
  assert.equal((await call("get", base + "/form-options", "user")).status, 200);
  assert.equal((await call("post", base, "user").send(payload())).status, 201);
  assert.equal((await call("get", base, "user")).status, 403);
});
test("creation defaults, sorted values and detail/list contract", async () => {
  const response = await call("post").send(payload());
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const option = response.body;
  assert.equal(option.type, "select"); assert.equal(option.sortOrder, 0);
  assert.equal(option.values[0].image, null); assert.equal(option.values[0].sortOrder, 0);
  assert(option.values.every(v => v.id));
  assert.equal((await call("get", base + "/" + option.id)).body.name, "Color");
  assert.equal((await call("get")).body.meta.total, 1);
});
test("editing preserves omitted values and row IDs; adds/removes/reorders values", async () => {
  const option = (await call("post").send(payload())).body;
  const path = base + "/" + option.id;
  const scalar = await call("patch", path).send({ name: "Colour" });
  assert.equal(scalar.status, 200); assert.deepEqual(scalar.body.values, option.values);
  const edited = await call("put", path).send({ values: [
    { id: option.values[1].id, name: "Navy" },
    { name: "Green", sortOrder: 1 },
  ] });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.name, "Colour");
  assert.equal(edited.body.values[0].name, "Green");
  assert.equal(edited.body.values[1].id, option.values[1].id);
  assert.equal(edited.body.values[1].image, "/uploads/blue.jpg");
  const cleared = await call("patch", path).send({ values: [
    { id: option.values[1].id, name: "Navy", image: null },
  ] });
  assert.equal(cleared.body.values[0].image, null);
});
test("invalid value IDs and incompatible type changes do not persist scalar edits", async () => {
  const option = (await call("post").send(payload())).body;
  const path = base + "/" + option.id;
  const invalid = await call("patch", path).send({ name: "Must not save", values: [{ id: randomUUID(), name: "Other" }] });
  assert.equal(invalid.status, 400); assert.equal(rows.get(option.id).name, "Color");
  assert.equal((await call("patch", path).send({ type: "text" })).status, 400);
  assert.equal(rows.get(option.id).type, "select");
  const text = await call("patch", path).send({ type: "text", values: [] });
  assert.equal(text.status, 200); assert.deepEqual(text.body.values, []);
  assert.equal((await call("patch", path).send({ type: "radio" })).status, 400);
  assert.equal((await call("post").send({ name: "Message", type: "textarea" })).status, 201);
  assert.equal((await call("post").send({ name: "Empty", type: "select", values: [] })).status, 400);
});
test("duplicates, malformed IDs, missing records and delete", async () => {
  duplicate = true;
  assert.equal((await call("post").send(payload())).status, 409);
  duplicate = false;
  assert.equal((await call("get", base + "/invalid")).status, 400);
  assert.equal((await call("get", base + "/" + randomUUID())).status, 404);
  assert.equal((await call("patch", base + "/" + randomUUID()).send({ name: "x" })).status, 404);
  const option = (await call("post").send(payload())).body;
  assert.equal((await call("delete", base + "/" + option.id)).status, 200);
  assert.equal(rows.size, 0);
  assert.equal((await call("delete", base + "/" + option.id)).status, 404);
});
test("query builder binds filters and rejects unsafe sorting/pagination", () => {
  const { qb, page, limit } = optionQuery({ search: "%_' OR true --", type: "select",
    date: "2026-09-29", sortBy: "name", sortOrder: "DESC", page: "2", limit: "5" });
  const [sql, params] = qb.getQueryAndParameters();
  assert.equal(page, 2); assert.equal(limit, 5); assert(!sql.includes("OR true --"));
  assert(params.includes("%\\%\\_' OR true --%")); assert(params.includes("select"));
  for (const query of [{ type: "bad" }, { date: "2026-02-30" }, { page: "0" }, { limit: "101" },
    { sortBy: "name;DROP TABLE users" }, { startDate: "2026-09-29", endDate: "2026-09-01" },
    { date: "2026-09-29", startDate: "2026-09-01" }])
    assert.throws(() => optionQuery(query), e => e.status === 400);
});
test("CSV/XLSX export follows list columns and escapes formulas", async () => {
  const option = (await call("post").send(payload({ name: "=1+1" }))).body;
  const csv = await call("get", base + "/export").query({ format: "csv" });
  assert.equal(csv.status, 200); assert(csv.text.includes("'=1+1"));
  const xlsx = await call("get", base + "/export").query({ format: "xlsx" }).buffer(true)
    .parse((res, cb) => {
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  assert.equal(xlsx.status, 200);
  const book = XLSX.read(xlsx.body, { type: "buffer" });
  assert.equal(XLSX.utils.sheet_to_json(book.Sheets.Options)[0]["Option Name"], "'=1+1");
  assert.equal(rows.get(option.id).name, "=1+1");
});
