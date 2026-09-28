// No database connection: repository doubles exercise HTTP/service paths.
const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const request = require("supertest");
const express = require("express");
const XLSX = require("xlsx");
const { AppDataSource: db } = require("../src/data-source");
const { Attribute } = require("../src/entities/attribute.entity");
const { AttributeGroup, DEFAULT_ATTRIBUTE_GROUP_ID: groupId } = require("../src/entities/attribute-group.entity");
const { validateAttribute, attributeQuery } = require("../src/services/attribute.service");
const auth = require("../src/middlewares/auth.middleware");
const { RBACService } = require("../src/services/rbac.service");
const originalAuth = auth.authenticate, originalPermission = RBACService.hasPermission;
const originalRepo = db.getRepository.bind(db);
let rows = new Map(), duplicate = false, granted = [];
const group = { id: groupId, name: "Product", sortOrder: 0 };
auth.authenticate = (req, res, next) => {
  if (!req.get("x-role")) return res.status(401).json({ message: "Unauthorized" });
  req.user = { id: "test", userRole: req.get("x-role"),
    permissions: granted.map(action => ({ resource: "attribute", action })) };
  next();
};
RBACService.hasPermission = async (_id, resource, action) => resource === "attribute" && granted.includes(action);
const app = express();
app.use(express.json());
app.use("/api/attributes", require("../src/routes/attribute.routes").default);
const api = request(app), base = "/api/attributes";
const call = (method, path = base, role = "su") => api[method](path).set("x-role", role);
const full = row => row ? { ...row, attributeGroup: group } : null;
const groupRepo = { existsBy: async ({ id }) => id === groupId, find: async () => [group] };
const repo = {
  create: dto => ({ sortOrder: 0, ...dto }),
  save: async row => {
    if (duplicate) throw { code: "23505" };
    const saved = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...row };
    rows.set(saved.id, saved); return saved;
  },
  existsBy: async ({ id }) => rows.has(id),
  findOne: async ({ where: { id } }) => full(rows.get(id)),
  findOneOrFail: async ({ where: { id } }) => {
    assert(rows.has(id)); return full(rows.get(id));
  },
  update: async (id, dto) => {
    if (duplicate) throw { code: "23505" };
    if (!rows.has(id)) return { affected: 0 };
    rows.set(id, { ...rows.get(id), ...dto }); return { affected: 1 };
  },
  delete: async id => ({ affected: rows.delete(id) ? 1 : 0 }),
  createQueryBuilder: alias => {
    const qb = originalRepo(Attribute).createQueryBuilder(alias);
    qb.getManyAndCount = async () => [[...rows.values()].map(full), rows.size];
    qb.getMany = async () => [...rows.values()].map(full);
    return qb;
  },
};
before(async () => {
  await db.buildMetadatas();
  db.getRepository = entity => entity === AttributeGroup ? groupRepo : repo;
});
beforeEach(() => { rows.clear(); duplicate = false; granted = []; });
after(() => {
  db.getRepository = originalRepo; auth.authenticate = originalAuth; RBACService.hasPermission = originalPermission;
});
test("metadata and SQL agree on default group, unique scope and restricted foreign key", () => {
  const metadata = db.getMetadata(Attribute);
  assert.equal(metadata.tableName, "attributes");
  assert.deepEqual(metadata.uniques[0].columns.map(c => c.propertyName), ["attributeGroupId", "name"]);
  assert.equal(metadata.columns.find(c => c.propertyName === "attributeGroupId").default, groupId);
  assert.equal(metadata.foreignKeys[0].onDelete, "RESTRICT");
  const sql = require("fs").readFileSync("docs/attribute-schema.sql", "utf8");
  assert(sql.includes(groupId)); assert(sql.includes('UNIQUE ("attributeGroupId", "name")'));
  assert.equal(db.isInitialized, false);
});
test("validates name, UUID and numeric order without accepting unknown fields", async () => {
  assert.equal((await validateAttribute({ name: " Material " }, true)).name, "Material");
  for (const body of [{}, null, [], { name: " " }, { name: null }, { name: "x\u0000y" },
    { name: "x", sortOrder: "0" }, { name: "x", sortOrder: -1 }, { name: "x", sortOrder: 0.5 },
    { name: "x", attributeGroupId: "Product" }, { name: "x", attributeGroupId: null },
    { name: "x", extra: true }])
    await assert.rejects(validateAttribute(body, true), e => e.status === 400);
  assert.equal((await validateAttribute({ sortOrder: 2 }, false)).sortOrder, 2);
});
test("routes protect reads and writes and allow creator group lookup", async () => {
  assert.equal((await api.get(base)).status, 401);
  assert.equal((await call("get", base, "user")).status, 403);
  granted = ["create"];
  assert.equal((await call("get", base + "/form-options", "user")).status, 200);
  assert.equal((await call("get", base, "user")).status, 403);
  assert.equal((await call("post", base, "user").send({ name: "Color" })).status, 201);
  assert.equal((await call("delete", base + "/" + randomUUID(), "user")).status, 403);
});
test("create, detail, partial update and group options match the form", async () => {
  const created = await call("post").send({ name: "Material" });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.attributeGroupId, groupId);
  assert.equal(created.body.attributeGroup.name, "Product");
  assert.equal(created.body.sortOrder, 0);
  const id = created.body.id;
  assert.equal((await call("get", base + "/" + id)).body.name, "Material");
  const updated = await call("patch", base + "/" + id).send({ sortOrder: 5 });
  assert.equal(updated.status, 200); assert.equal(updated.body.name, "Material");
  assert.equal(updated.body.attributeGroupId, groupId);
  assert.equal(updated.body.sortOrder, 5);
  assert.equal((await call("put", base + "/" + id).send({ name: "Fabric" })).body.name, "Fabric");
  assert.equal((await call("get", base + "/form-options")).body.defaults.attributeGroupId, groupId);
  assert.equal((await call("get")).body.meta.total, 1);
});
test("missing group, uniqueness conflicts, malformed IDs and missing records return client errors", async () => {
  assert.equal((await call("post").send({ name: "x", attributeGroupId: randomUUID() })).status, 400);
  duplicate = true;
  assert.equal((await call("post").send({ name: "x" })).status, 409);
  duplicate = false;
  assert.equal((await call("get", base + "/invalid")).status, 400);
  const id = randomUUID();
  assert.equal((await call("get", base + "/" + id)).status, 404);
  assert.equal((await call("patch", base + "/" + id).send({ name: "x" })).status, 404);
  assert.equal((await call("delete", base + "/" + id)).status, 404);
});
test("real query builder binds search, group and date filters and rejects unsafe sort", () => {
  const { qb, page, limit } = attributeQuery({
    search: "%_' OR true --", attributeGroupId: groupId, startDate: "2026-09-01", endDate: "2026-09-28",
    sortBy: "attributeGroup", sortOrder: "ASC", page: "2", limit: "5",
  });
  const [sql, params] = qb.getQueryAndParameters();
  assert.equal(page, 2); assert.equal(limit, 5);
  assert(sql.includes("JOIN")); assert(sql.includes("ILIKE")); assert(!sql.includes("OR true --"));
  assert(params.includes(groupId)); assert(params.includes("%\\%\\_' OR true --%"));
  for (const query of [{ page: "0" }, { limit: "101" }, { sortBy: "__proto__" },
    { sortBy: "name;DROP TABLE users" }, { sortOrder: "invalid" }, { date: "2026-02-30" },
    { date: "2026-09-28", startDate: "2026-09-01" },
    { startDate: "2026-09-28", endDate: "2026-09-01" }, { attributeGroupId: "Product" }])
    assert.throws(() => attributeQuery(query), e => e.status === 400);
});
test("CSV/XLSX export matches list columns and escapes formulas", async () => {
  const created = (await call("post").send({ name: "=1+1" })).body;
  const csv = await call("get", base + "/export").query({ format: "csv" });
  assert.equal(csv.status, 200); assert(csv.text.includes("'=1+1"));
  const xlsx = await call("get", base + "/export").query({ format: "xlsx" }).buffer(true)
    .parse((res, callback) => {
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    });
  assert.equal(xlsx.status, 200);
  const book = XLSX.read(xlsx.body, { type: "buffer" });
  const row = XLSX.utils.sheet_to_json(book.Sheets.Attributes)[0];
  assert.equal(row["Attribute Name"], "'=1+1"); assert.equal(row["Attribute Group"], "Product");
  assert.equal(rows.get(created.id).name, "=1+1");
});
test("delete removes only the selected master attribute", async () => {
  const first = (await call("post").send({ name: "First" })).body;
  await call("post").send({ name: "Second" });
  assert.equal((await call("delete", base + "/" + first.id)).status, 200);
  assert.equal(rows.size, 1); assert.equal(rows.has(first.id), false);
});
