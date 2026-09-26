const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const request = require("supertest");
const XLSX = require("xlsx");
const url = process.env.BANNER_TEST_DATABASE_URL;
if (!url || !/^postgres(?:ql)?:\/\/[^/]+\/desimore_banner_test(?:\?.*)?$/.test(url))
  throw new Error("Set BANNER_TEST_DATABASE_URL to an isolated desimore_banner_test database");
process.env.DATABASE_URL = url;
process.env.DB_SSL = "false";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "banner-test-only";
const { AppDataSource: db } = require("../src/data-source");
const { User } = require("../src/entities/user.entity");
const { Banner } = require("../src/entities/banner.entity");
const { Permission } = require("../src/entities/permission.entity");
const { CreateBanners1790553600000 } = require("../src/migrations/1790553600000-CreateBanners");
const { generateAccessToken } = require("../src/utils/jwt");
const api = request(require("../src/app").default);
let adminCookie, userCookie;
const payload = (overrides = {}) => ({
  name: "Banner " + randomUUID(),
  slides: [{ image: "/uploads/banner.jpg" }],
  ...overrides,
});
const call = (method, path, cookie = adminCookie) => api[method](path).set("Cookie", cookie);
const create = async (overrides = {}) => {
  const response = await call("post", "/api/banners").send(payload(overrides));
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
};
before(async () => {
  await db.initialize();
  await db.dropDatabase();
  await db.synchronize();
  const runner = db.createQueryRunner();
  await runner.startTransaction();
  try {
    const migration = new CreateBanners1790553600000();
    await migration.down(runner);
    await migration.up(runner);
    await runner.commitTransaction();
  } catch (error) { await runner.rollbackTransaction(); throw error; }
  finally { await runner.release(); }
  for (const [role, index] of [["su", 1], ["user", 2]]) {
    const user = db.getRepository(User).create({
      firstname: "Banner", lastname: "Test", username: "bannertest" + index,
      email: "bannertest" + index + "@example.com", phone: "555000000" + index, userRole: role,
    });
    user.setPassword("banner-test-password");
    await db.getRepository(User).save(user);
    const cookie = "accessToken=" + generateAccessToken({ userId: user.id, email: user.email });
    if (role === "su") adminCookie = cookie; else userCookie = cookie;
  }
});
after(async () => { if (db.isInitialized) await db.destroy(); });
test("migration registers permissions and admin endpoints enforce authentication/RBAC", async () => {
  assert.equal(await db.getRepository(Permission).countBy({ resource: "banner" }), 4);
  assert.equal((await api.get("/api/banners")).status, 401);
  for (const path of ["/api/banners", "/api/banners/export"])
    assert.equal((await call("get", path, userCookie)).status, 403);
  assert.equal((await call("post", "/api/banners", userCookie).send(payload())).status, 403);
});
test("create and get preserve slide values, defaults and ascending sort", async () => {
  const banner = await create({ name: "  Main banner  ", slides: [
    { title: "Second", image: "https://example.com/b.jpg", link: "https://example.com/offers", sortOrder: 2 },
    { image: "/catalog/a.jpg", link: "/products", sortOrder: 0 },
  ] });
  assert.equal(banner.name, "Main banner");
  assert.equal(banner.isActive, true);
  assert.equal(banner.slideCount, 2);
  assert.equal(banner.slides[0].image, "/catalog/a.jpg");
  assert.equal(banner.slides[0].title, "");
  const response = await call("get", "/api/banners/" + banner.id);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.slides, banner.slides);
});
test("patch and put preserve omitted fields and replace slides atomically", async () => {
  const banner = await create();
  const disabled = await call("patch", "/api/banners/" + banner.id).send({ isActive: false });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.body.isActive, false);
  assert.deepEqual(disabled.body.slides, banner.slides);
  const updated = await call("put", "/api/banners/" + banner.id).send({
    slides: [{ title: "Replacement", image: "/uploads/new.jpg" }],
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, banner.name);
  assert.equal(updated.body.isActive, false);
  assert.equal(updated.body.slides[0].sortOrder, 0);
  const invalid = await call("patch", "/api/banners/" + banner.id).send({ name: "Should not save", slides: [] });
  assert.equal(invalid.status, 400);
  assert.equal((await db.getRepository(Banner).findOneBy({ id: banner.id })).name, banner.name);
});
test("invalid field types, unsafe URLs, unknown fields and missing images are rejected", async () => {
  const count = await db.getRepository(Banner).count();
  for (const overrides of [
    { name: " " }, { name: undefined }, { isActive: "Enabled" }, { isActive: null },
    { slides: undefined }, { slides: [] }, { slides: null }, { extra: true },
    { slides: [{}] }, { slides: [null] },
    { slides: [{ image: "javascript:alert(1)" }] },
    { slides: [{ image: "//example.com/a.jpg" }] },
    { slides: [{ image: "/uploads/a.jpg", link: "javascript:alert(1)" }] },
    { slides: [{ image: "/uploads/a.jpg", link: "//evil.example.com" }] },
    { slides: [{ image: "/uploads/a.jpg", sortOrder: "1" }] },
    { slides: [{ image: "/uploads/a.jpg", sortOrder: -1 }] },
  ]) {
    const response = await call("post", "/api/banners").send(payload(overrides));
    assert.equal(response.status, 400, JSON.stringify(response.body));
  }
  assert.equal(await db.getRepository(Banner).count(), count);
});
test("listing supports literal search, filtering, global sorting and pagination", async () => {
  const prefix = "Filter-" + randomUUID();
  await create({ name: prefix + "-Z", isActive: false });
  const a = await create({ name: prefix + "-A" });
  await create({ name: prefix + "-M" });
  const result = await call("get", "/api/banners").query({ search: prefix, sortBy: "name", sortOrder: "ASC", limit: 1, page: 2 });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.meta.total, 3);
  assert.equal(result.body.meta.totalPages, 3);
  assert.equal(result.body.data[0].name, prefix + "-M");
  const disabled = await call("get", "/api/banners").query({ search: prefix, isActive: false });
  assert.equal(disabled.body.meta.total, 1);
  await create({ name: "Literal%_" + prefix });
  assert.equal((await call("get", "/api/banners").query({ search: "Literal%_" })).body.meta.total, 1);
  await db.getRepository(Banner).update(a.id, { createdAt: new Date("2025-01-02T12:00:00Z") });
  const dated = await call("get", "/api/banners").query({ search: prefix, date: "2025-01-02" });
  assert.equal(dated.status, 200, JSON.stringify(dated.body));
  assert.equal(dated.body.meta.total, 1);
  assert.equal(dated.body.data[0].id, a.id);
});
test("malformed filters, UUIDs and missing banners return client errors", async () => {
  for (const query of [
    { page: 0 }, { limit: 101 }, { sortBy: "name;DROP TABLE banners" },
    { sortOrder: "invalid" }, { isActive: "yes" }, { date: "2025-02-30" },
    { startDate: "2025-02-01", endDate: "2025-01-01" },
    { date: "2025-01-01", startDate: "2025-01-01" },
  ]) assert.equal((await call("get", "/api/banners").query(query)).status, 400);
  assert.equal((await call("get", "/api/banners/not-a-uuid")).status, 400);
  const id = randomUUID();
  assert.equal((await call("get", "/api/banners/" + id)).status, 404);
  assert.equal((await call("patch", "/api/banners/" + id).send({ isActive: false })).status, 404);
  assert.equal((await call("delete", "/api/banners/" + id)).status, 404);
});
test("CSV/XLSX export includes filtered rows and prevents spreadsheet formulas", async () => {
  const name = "=Export-" + randomUUID();
  await create({ name });
  const csv = await call("get", "/api/banners/export").query({ search: name, format: "csv" });
  assert.equal(csv.status, 200);
  assert(csv.text.includes("'" + name));
  const xlsx = await call("get", "/api/banners/export").query({ search: name, format: "xlsx" })
    .buffer(true).parse((res, callback) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    });
  assert.equal(xlsx.status, 200);
  const book = XLSX.read(xlsx.body, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(book.Sheets.Banners);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]["Banner Name"], "'" + name);
});
test("delete removes the banner and its slides", async () => {
  const banner = await create();
  assert.equal((await call("delete", "/api/banners/" + banner.id)).status, 200);
  assert.equal(await db.getRepository(Banner).findOneBy({ id: banner.id }), null);
});
