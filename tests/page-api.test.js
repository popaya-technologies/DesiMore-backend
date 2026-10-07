// No database connection or schema writes: exercise HTTP handlers with a repository double.
require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const { randomUUID } = require("crypto");
const { AppDataSource } = require("../src/data-source");
const { validatePageInput } = require("../src/services/page.service");
const calls = [];
let stored;
const qb = {};
for (const method of ["andWhere", "orderBy", "addOrderBy", "skip", "take"])
  qb[method] = (...args) => { calls.push([method, ...args]); return qb; };
qb.getManyAndCount = async () => [[stored], 1];
qb.getMany = async () => [stored];
const repository = {
  create: value => ({ id: randomUUID(), description: "", media: [], bottom: "none", sortOrder: 0, isActive: true, createdAt: new Date(), ...value }),
  save: async value => stored = value,
  findOneBy: async ({ id }) => stored?.id === id ? stored : null,
  update: async (id, value) => { if (stored?.id !== id) return { affected: 0 }; stored = { ...stored, ...value }; return { affected: 1 }; },
  delete: async id => { if (stored?.id !== id) return { affected: 0 }; stored = null; return { affected: 1 }; },
  createQueryBuilder: () => qb,
};
AppDataSource.getRepository = () => repository;
// Route authorization is tested using the real middleware and a stubbed user lookup.
const auth = require("../src/middlewares/auth.middleware");
auth.authenticate = (req, res, next) => {
  if (!req.headers["x-test-role"]) return res.status(401).json({ message: "Unauthorized" });
  req.user = { id: randomUUID(), userRole: req.headers["x-test-role"] };
  next();
};
require("../src/services/rbac.service").RBACService.hasPermission = async () => false;
const app = express();
app.use(express.json());
app.use("/api/pages", require("../src/routes/page.routes").default);
const api = request(app);
const call = (method, path) => api[method](path).set("x-test-role", "su");

test("required fields, strict types, slug syntax, media URLs and HTML sanitization", async () => {
  for (const input of [{}, { title: "A" }, { title: " ", slug: "a" },
    { title: "A", slug: "a b" }, { title: "A", slug: "A" },
    { title: "A", slug: "a", isActive: "true" }, { title: "A", slug: "a", bottom: "invalid" },
    { title: "A", slug: "a", sortOrder: -1 }, { title: "A", slug: "a", media: [null] },
    { title: "A", slug: "a", media: ["javascript:alert(1)"] },
    { title: "A", slug: "a", media: ["//evil.example/image.jpg"] },
    { title: "A", slug: "a", extra: true }, { title: null }])
    await assert.rejects(validatePageInput(input, true), error => error.status === 400);
  const dto = await validatePageInput({ title: " About ", slug: "about", media: ["/uploads/a.jpg"],
    description: '<p onclick="evil()">Hello</p><script>evil()</script>' }, true);
  assert.equal(dto.title, "About");
  assert.equal(dto.description, "<p>Hello</p>");
  assert.deepEqual((await validatePageInput({ media: [] }, false)).media, []);
});

test("routes enforce authentication and permissions", async () => {
  assert.equal((await api.get("/api/pages")).status, 401);
  assert.equal((await api.get("/api/pages").set("x-test-role", "user")).status, 403);
});

test("HTTP CRUD, filtering, pagination, exports and missing records", async () => {
  let response = await call("post", "/api/pages").send({ title: "About", slug: "about" });
  assert.equal(response.status, 201);
  const id = response.body.id;
  assert.equal(response.body.isActive, true);
  response = await call("patch", "/api/pages/" + id).send({ isActive: false, media: [] });
  assert.equal(response.status, 200);
  assert.equal(response.body.title, "About");
  assert.equal(response.body.isActive, false);
  response = await call("get", "/api/pages").query({ search: "%_", date: "2026-10-07", bottom: "none", limit: 1, page: 2, sortBy: "title", sortOrder: "ASC" });
  assert.equal(response.status, 200);
  assert.equal(response.body.meta.total, 1);
  assert(calls.some(c => c[0] === "skip" && c[1] === 1));
  assert(calls.some(c => c[0] === "andWhere" && c[2]?.search === "%\\%\\_%"));
  for (const query of [{ date: "2026-02-30" }, { limit: 101 }, { sortBy: "DROP TABLE" }, { bottom: "wrong" }])
    assert.equal((await call("get", "/api/pages").query(query)).status, 400);
  assert.equal((await call("get", "/api/pages/bad-id")).status, 400);
  assert.equal((await call("get", "/api/pages/" + randomUUID())).status, 404);
  stored.title = "=FORMULA()";
  response = await call("get", "/api/pages/export");
  assert.equal(response.status, 200);
  assert(response.text.includes("'=FORMULA()"));
  assert.equal((await call("get", "/api/pages/export?format=invalid")).status, 400);
  assert.equal((await call("delete", "/api/pages/" + id)).status, 200);
  assert.equal((await call("get", "/api/pages/" + id)).status, 404);
});

test("database uniqueness errors produce HTTP 409", async () => {
  const save = repository.save;
  repository.save = async () => { throw { code: "23505" }; };
  try {
    const response = await call("post", "/api/pages").send({ title: "Duplicate", slug: "duplicate" });
    assert.equal(response.status, 409);
  } finally { repository.save = save; }
});
