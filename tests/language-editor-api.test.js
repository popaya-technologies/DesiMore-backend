// Repository mocks and metadata only: no connection, table creation, or data writes.
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const request = require("supertest");
const express = require("express");
const XLSX = require("xlsx");
const { AppDataSource: db } = require("../src/data-source");
const { LanguageTranslation } = require("../src/entities/language-translation.entity");
const { validateTranslation, validateTranslationIds, translationQuery } = require("../src/services/language-editor.service");
const auth = require("../src/middlewares/auth.middleware");
const { RBACService } = require("../src/services/rbac.service");
const originalAuth = auth.authenticate, originalPermission = RBACService.hasPermission;
const originalRepo = db.getRepository.bind(db), originalTransaction = db.transaction;
let rows = new Map(), duplicate = false, deleted = 0, transactions = 0, granted = [];
auth.authenticate = (req, res, next) => {
  if (!req.get("x-role")) return res.status(401).json({ message: "Unauthorized" });
  req.user = { id: "test", userRole: req.get("x-role") }; next();
};
RBACService.hasPermission = async (_id, resource, action) => resource === "language-editor" && granted.includes(action);
const app = express();
app.use(express.json());
app.use("/api/language-editor", require("../src/routes/language-editor.routes").default);
const api = request(app), base = "/api/language-editor";
const call = (method, path = base, role = "su") => api[method](path).set("x-role", role);
const payload = (extra = {}) => ({ route: "common/home", key: "title", value: "Welcome", ...extra });
const repo = {
  create: dto => ({ store: "Default", language: "English", ...dto }),
  save: async row => {
    if (duplicate) throw { code: "23505" };
    const result = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...row };
    rows.set(result.id, result); return result;
  },
  update: async (id, dto) => {
    if (duplicate) throw { code: "23505" };
    if (!rows.has(id)) return { affected: 0 };
    rows.set(id, { ...rows.get(id), ...dto }); return { affected: 1 };
  },
  findOneBy: async ({ id }) => rows.get(id) ?? null,
  find: async options => {
    assert.equal(options.lock.mode, "pessimistic_write");
    return options.where.id.value.map(id => rows.get(id)).filter(Boolean);
  },
  delete: async ids => {
    deleted++;
    let affected = 0;
    for (const id of Array.isArray(ids) ? ids : [ids]) if (rows.delete(id)) affected++;
    return { affected };
  },
  createQueryBuilder: alias => {
    const qb = originalRepo(LanguageTranslation).createQueryBuilder(alias);
    qb.getManyAndCount = async () => [[...rows.values()], rows.size];
    qb.getMany = async () => [...rows.values()];
    qb.getRawMany = async () => [];
    return qb;
  },
};
before(async () => {
  await db.buildMetadatas();
  db.getRepository = () => repo;
  db.transaction = async cb => { transactions++; return cb({ getRepository: () => repo }); };
});
beforeEach(() => { rows.clear(); duplicate = false; deleted = 0; transactions = 0; granted = []; });
after(() => {
  db.getRepository = originalRepo; db.transaction = originalTransaction;
  auth.authenticate = originalAuth; RBACService.hasPermission = originalPermission;
});
test("metadata matches manual schema; no database is initialized", () => {
  const metadata = db.getMetadata(LanguageTranslation);
  assert.equal(metadata.tableName, "language_translations");
  assert.deepEqual(metadata.uniques[0].columns.map(c => c.propertyName), ["store", "language", "route", "key"]);
  const sql = require("fs").readFileSync("docs/language-editor-schema.sql", "utf8");
  assert(sql.includes('UNIQUE ("store", "language", "route", "key")'));
  assert.equal(db.isInitialized, false);
});
test("validation preserves translations and rejects malformed requests", async () => {
  const value = "  नमस्ते {name}\nHello  ";
  const dto = await validateTranslation(payload({ route: " common/home ", value }), true);
  assert.equal(dto.route, "common/home"); assert.equal(dto.value, value);
  assert.equal((await validateTranslation({ value: "" }, false)).value, "");
  for (const input of [{}, null, [], payload({ route: "" }), payload({ value: undefined }),
    payload({ value: null }), payload({ store: null }), payload({ key: "x\ny" }),
    payload({ value: "\u0000" }), payload({ extra: true })])
    await assert.rejects(validateTranslation(input, true), e => e.status === 400);
  const id = randomUUID();
  for (const input of [{ ids: [] }, { ids: [id, id] }, { ids: ["invalid"] }])
    await assert.rejects(validateTranslationIds(input), e => e.status === 400);
});
test("query builder uses parameters, exact filters and safe sorting", () => {
  const { qb, page, limit } = translationQuery({
    search: "%_' OR true --", store: "Default", language: "English",
    startDate: "2026-09-01", endDate: "2026-09-28", page: "2", limit: "5", sortBy: "key", sortOrder: "ASC",
  });
  const [sql, parameters] = qb.getQueryAndParameters();
  assert.equal(page, 2); assert.equal(limit, 5);
  assert(sql.includes("ILIKE")); assert(!sql.includes("OR true --"));
  assert(parameters.includes("%\\%\\_' OR true --%"));
  for (const query of [{ sortBy: "key;DROP TABLE users" }, { page: "0" }, { limit: "101" },
    { date: "2026-02-30" }, { date: "2026-09-28", startDate: "2026-09-01" },
    { startDate: "2026-09-28", endDate: "2026-09-01" }, { search: [] }])
    assert.throws(() => translationQuery(query), e => e.status === 400);
});
test("routes apply authentication and action-specific permissions", async () => {
  assert.equal((await api.get(base)).status, 401);
  assert.equal((await call("get", base, "user")).status, 403);
  granted = ["read"];
  assert.equal((await call("get", base, "user")).status, 200);
  assert.equal((await call("post", base, "user").send(payload())).status, 403);
  assert.equal((await call("delete", base + "/bulk", "user").send({ ids: [randomUUID()] })).status, 403);
});
test("CRUD, pagination response and form options have the expected contract", async () => {
  const created = await call("post").send(payload());
  assert.equal(created.status, 201);
  assert.equal(created.body.store, "Default"); assert.equal(created.body.language, "English");
  const id = created.body.id;
  assert.equal((await call("get", base + "/" + id)).body.value, "Welcome");
  const patched = await call("patch", base + "/" + id).send({ value: "" });
  assert.equal(patched.status, 200); assert.equal(patched.body.value, ""); assert.equal(patched.body.key, "title");
  assert.equal((await call("put", base + "/" + id).send({ language: "Hindi" })).body.language, "Hindi");
  assert.equal((await call("get")).body.meta.total, 1);
  assert.deepEqual((await call("get", base + "/form-options")).body.defaults, { store: "Default", language: "English" });
  assert.equal((await call("delete", base + "/" + id)).status, 200); assert.equal(rows.size, 0);
});
test("database uniqueness is mapped to 409; missing records and malformed IDs are rejected", async () => {
  duplicate = true;
  assert.equal((await call("post").send(payload())).status, 409);
  duplicate = false;
  assert.equal((await call("get", base + "/bad")).status, 400);
  const id = randomUUID();
  assert.equal((await call("get", base + "/" + id)).status, 404);
  assert.equal((await call("patch", base + "/" + id).send({ value: "x" })).status, 404);
  assert.equal((await call("delete", base + "/" + id)).status, 404);
});
test("bulk deletion checks all IDs in a transaction before deleting anything", async () => {
  const first = (await call("post").send(payload())).body;
  const second = (await call("post").send(payload({ key: "second" }))).body;
  const missing = await call("delete", base + "/bulk").send({ ids: [first.id, randomUUID()] });
  assert.equal(missing.status, 404); assert.equal(deleted, 0); assert.equal(rows.size, 2);
  const result = await call("delete", base + "/bulk").send({ ids: [first.id, second.id] });
  assert.equal(result.status, 200); assert.equal(result.body.deletedCount, 2);
  assert.equal(rows.size, 0); assert.equal(transactions, 2);
});
test("CSV and XLSX exports escape formulas without modifying stored values", async () => {
  const created = (await call("post").send(payload({ value: "=1+1" }))).body;
  const csv = await call("get", base + "/export").query({ format: "csv" });
  assert.equal(csv.status, 200); assert(csv.text.includes("'=1+1"));
  const xlsx = await call("get", base + "/export").query({ format: "xlsx" }).buffer(true)
    .parse((res, callback) => {
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    });
  assert.equal(xlsx.status, 200);
  const book = XLSX.read(xlsx.body, { type: "buffer" });
  assert.equal(XLSX.utils.sheet_to_json(book.Sheets.Translations)[0].Value, "'=1+1");
  assert.equal(rows.get(created.id).value, "=1+1");
});
