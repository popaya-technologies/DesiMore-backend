// No database initialization or schema writes; repository doubles only.
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const request = require("supertest");
const express = require("express");
const XLSX = require("xlsx");
const { AppDataSource: db } = require("../src/data-source");
const { AttributeGroup, DEFAULT_ATTRIBUTE_GROUP_ID } = require("../src/entities/attribute-group.entity");
const { validateAttributeGroup, attributeGroupQuery } = require("../src/services/attribute-group.service");
const auth = require("../src/middlewares/auth.middleware");
const { RBACService } = require("../src/services/rbac.service");
const originalAuth = auth.authenticate, originalPermission = RBACService.hasPermission;
const originalRepo = db.getRepository.bind(db);
let rows = new Map(), duplicate = false, referenced = false, granted = [];
auth.authenticate = (req, res, next) => {
  if (!req.get("x-role")) return res.status(401).json({ message: "Unauthorized" });
  req.user = { id: "test", userRole: req.get("x-role") }; next();
};
RBACService.hasPermission = async (_id, resource, action) => resource === "attribute-group" && granted.includes(action);
const app = express();
app.use(express.json());
app.use("/api/attribute-groups", require("../src/routes/attribute-group.routes").default);
const api = request(app), base = "/api/attribute-groups";
const call = (method, path = base, role = "su") => api[method](path).set("x-role", role);
const repo = {
  create: dto => ({ sortOrder: 0, ...dto }),
  save: async dto => {
    if (duplicate) throw { code: "23505" };
    const row = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...dto };
    rows.set(row.id, row); return row;
  },
  update: async (id, dto) => {
    if (duplicate) throw { code: "23505" };
    if (!rows.has(id)) return { affected: 0 };
    rows.set(id, { ...rows.get(id), ...dto }); return { affected: 1 };
  },
  findOneBy: async ({ id }) => rows.get(id) ?? null,
  delete: async id => {
    if (referenced) throw { code: "23503" };
    return { affected: rows.delete(id) ? 1 : 0 };
  },
  createQueryBuilder: alias => {
    const qb = originalRepo(AttributeGroup).createQueryBuilder(alias);
    qb.getManyAndCount = async () => [[...rows.values()], rows.size];
    qb.getMany = async () => [...rows.values()];
    return qb;
  },
};
before(async () => { await db.buildMetadatas(); db.getRepository = () => repo; });
beforeEach(() => { rows.clear(); duplicate = false; referenced = false; granted = []; });
after(() => {
  db.getRepository = originalRepo; auth.authenticate = originalAuth; RBACService.hasPermission = originalPermission;
});
test("entity matches existing group schema and SQL preserves existing table", () => {
  const metadata = db.getMetadata(AttributeGroup);
  assert.equal(metadata.tableName, "attribute_groups");
  assert.equal(metadata.columns.find(c => c.propertyName === "sortOrder").default, 0);
  const sql = require("fs").readFileSync("docs/attribute-group-schema.sql", "utf8");
  assert(sql.includes('CREATE TABLE IF NOT EXISTS "attribute_groups"'));
  assert(sql.includes(DEFAULT_ATTRIBUTE_GROUP_ID)); assert.equal(db.isInitialized, false);
});
test("validation rejects bad fields and trims valid names", async () => {
  assert.equal((await validateAttributeGroup({ name: " Product " }, true)).name, "Product");
  for (const body of [{}, [], null, { name: "" }, { name: null }, { name: "x\u0000" },
    { name: "x", sortOrder: "0" }, { name: "x", sortOrder: -1 }, { name: "x", extra: true }])
    await assert.rejects(validateAttributeGroup(body, true), e => e.status === 400);
  assert.equal((await validateAttributeGroup({ sortOrder: 2 }, false)).sortOrder, 2);
});
test("authentication and permission checks protect endpoints", async () => {
  assert.equal((await api.get(base)).status, 401);
  assert.equal((await call("get", base, "user")).status, 403);
  granted = ["read"];
  assert.equal((await call("get", base, "user")).status, 200);
  assert.equal((await call("post", base, "user").send({ name: "x" })).status, 403);
});
test("create, detail, partial PUT/PATCH and pagination contract", async () => {
  const created = await call("post").send({ name: "Technical" });
  assert.equal(created.status, 201); assert.equal(created.body.sortOrder, 0);
  const id = created.body.id;
  assert.equal((await call("get", base + "/" + id)).body.name, "Technical");
  const update = await call("patch", base + "/" + id).send({ sortOrder: 4 });
  assert.equal(update.status, 200); assert.equal(update.body.name, "Technical");
  const renamed = await call("put", base + "/" + id).send({ name: "Specifications" });
  assert.equal(renamed.body.sortOrder, 4); assert.equal(renamed.body.name, "Specifications");
  assert.equal((await call("get")).body.meta.total, 1);
});
test("duplicate names, missing IDs and protected/referenced deletion return useful errors", async () => {
  duplicate = true;
  assert.equal((await call("post").send({ name: "x" })).status, 409);
  duplicate = false;
  assert.equal((await call("get", base + "/invalid")).status, 400);
  assert.equal((await call("get", base + "/" + randomUUID())).status, 404);
  assert.equal((await call("patch", base + "/" + randomUUID()).send({ name: "x" })).status, 404);
  assert.equal((await call("delete", base + "/" + DEFAULT_ATTRIBUTE_GROUP_ID)).status, 409);
  const created = (await call("post").send({ name: "x" })).body;
  referenced = true;
  assert.equal((await call("delete", base + "/" + created.id)).status, 409);
  assert(rows.has(created.id));
  referenced = false;
  assert.equal((await call("delete", base + "/" + created.id)).status, 200);
  assert.equal((await call("delete", base + "/" + created.id)).status, 404);
});
test("query generation parameterizes search/date filters and rejects unsafe sorting", () => {
  const { qb, page, limit } = attributeGroupQuery({
    search: "%_' OR true --", date: "2026-09-28", sortBy: "name", sortOrder: "DESC", page: "2", limit: "5",
  });
  const [sql, params] = qb.getQueryAndParameters();
  assert.equal(page, 2); assert.equal(limit, 5);
  assert(sql.includes("ILIKE")); assert(!sql.includes("OR true --"));
  assert(params.includes("%\\%\\_' OR true --%"));
  for (const query of [{ sortBy: "name;DROP TABLE users" }, { sortOrder: "invalid" }, { page: "0" },
    { limit: "101" }, { date: "2026-02-30" }, { date: "2026-09-28", startDate: "2026-09-01" },
    { startDate: "2026-09-28", endDate: "2026-09-01" }])
    assert.throws(() => attributeGroupQuery(query), e => e.status === 400);
});
test("CSV and XLSX exports escape formulas and retain data", async () => {
  const created = (await call("post").send({ name: "=1+1" })).body;
  const csv = await call("get", base + "/export").query({ format: "csv" });
  assert.equal(csv.status, 200); assert(csv.text.includes("'=1+1"));
  const xlsx = await call("get", base + "/export").query({ format: "xlsx" }).buffer(true)
    .parse((res, cb) => {
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  assert.equal(xlsx.status, 200);
  const book = XLSX.read(xlsx.body, { type: "buffer" });
  assert.equal(XLSX.utils.sheet_to_json(book.Sheets["Attribute Groups"])[0]["Attribute Group Name"], "'=1+1");
  assert.equal(rows.get(created.id).name, "=1+1");
});
