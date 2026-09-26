const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const request = require("supertest");
const url = process.env.MAIL_TEST_DATABASE_URL;
if (!url || !/^postgres(?:ql)?:\/\/[^/]+\/desimore_mail_test(?:\?.*)?$/.test(url))
  throw new Error("Set MAIL_TEST_DATABASE_URL to an isolated desimore_mail_test database");
process.env.DATABASE_URL = url;
process.env.DB_SSL = "false";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "mail-test-only";
const { AppDataSource: db } = require("../src/data-source");
const { User } = require("../src/entities/user.entity");
const { NewsletterSubscriber } = require("../src/entities/newsletter-subscriber.entity");
const { MailRequest } = require("../src/entities/mail-request.entity");
const { CreateMail1790467200000 } = require("../src/migrations/1790467200000-CreateMail");
const { generateAccessToken } = require("../src/utils/jwt");
const email = require("../src/utils/email");
const originalSend = email.sendEmail;
let sent = [], fail = false, adminCookie, userCookie;
email.sendEmail = async options => {
  sent.push(options);
  if (fail) throw new Error("Simulated uncertain provider response");
};
const api = request(require("../src/app").default);
const payload = (overrides = {}) => ({
  requestId: randomUUID(), from: "default", to: "newsletter_subscribers",
  subject: "Newsletter", message: "<p>Hello subscribers</p>", ...overrides,
});
const send = body => api.post("/api/mail/send").set("Cookie", adminCookie).send(body);
before(async () => {
  await db.initialize();
  await db.dropDatabase();
  await db.synchronize();
  const runner = db.createQueryRunner();
  await runner.startTransaction();
  try {
    const migration = new CreateMail1790467200000();
    await migration.down(runner);
    await migration.up(runner);
    await runner.commitTransaction();
  } catch (error) { await runner.rollbackTransaction(); throw error; }
  finally { await runner.release(); }
  for (const [role, index] of [["su", 1], ["user", 2]]) {
    const user = db.getRepository(User).create({
      firstname: "Mail", lastname: "Test", username: "mailtest" + index,
      email: "mailtest" + index + "@example.com", phone: "555000000" + index, userRole: role,
    });
    user.setPassword("mail-test-password");
    await db.getRepository(User).save(user);
    const cookie = "accessToken=" + generateAccessToken({ userId: user.id, email: user.email });
    if (role === "su") adminCookie = cookie; else userCookie = cookie;
  }
});
after(async () => {
  email.sendEmail = originalSend;
  if (db.isInitialized) await db.destroy();
});
test("mail endpoints require authenticated mail permission", async () => {
  assert.equal((await api.post("/api/mail/send").send(payload())).status, 401);
  assert.equal((await api.post("/api/mail/send").set("Cookie", userCookie).send(payload())).status, 403);
  assert.equal((await api.get("/api/mail/form-options").set("Cookie", userCookie)).status, 403);
});
test("empty audience is rejected without starting a request", async () => {
  assert.equal((await send(payload())).status, 400);
  assert.equal(await db.getRepository(MailRequest).count(), 0);
});
test("form options count only active subscribers", async () => {
  await db.getRepository(NewsletterSubscriber).save([
    { email: "active@example.com" }, { email: "second@example.com" },
    { email: "inactive@example.com", isActive: false },
  ]);
  const result = await api.get("/api/mail/form-options").set("Cookie", adminCookie);
  assert.equal(result.status, 200);
  assert.equal(result.body.from[0].value, "default");
  assert.equal(result.body.to[0].count, 2);
});
test("invalid mail and empty rich text never send", async () => {
  const count = sent.length;
  for (const overrides of [
    { subject: "" }, { subject: "Hi\r\nBcc: a@example.com" },
    { message: "<p><br>&nbsp;</p>" }, { message: "<script>alert(1)</script>" },
    { from: "attacker@example.com" }, { to: "all_users" },
    { requestId: "bad" }, { extra: true },
  ]) assert.equal((await send(payload(overrides))).status, 400);
  assert.equal(sent.length, count);
});
test("send sanitizes HTML, excludes inactive recipients and prevents duplicate sends", async () => {
  sent = [];
  const body = payload({ message: '<p>Hello<script>alert(1)</script><img src="https://example.com/a.png" onerror="bad()"></p>' });
  const result = await send(body);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.status, "completed");
  assert.equal(result.body.accepted, 2);
  assert.deepEqual(sent.map(s => s.to).sort(), ["active@example.com", "second@example.com"]);
  assert(sent.every(s => !s.html.includes("script") && !s.html.includes("onerror")));
  assert(sent.every(s => !("cc" in s) && !("bcc" in s)));
  assert.equal((await send(body)).body.id, result.body.id);
  assert.equal(sent.length, 2);
  assert.equal((await send({ ...body, subject: "Changed" })).status, 409);
  const status = await api.get("/api/mail/requests/" + body.requestId).set("Cookie", adminCookie);
  assert.equal(status.body.accepted, 2);
});
test("concurrent duplicate requests send once", async () => {
  sent = [];
  const body = payload();
  const results = await Promise.all([send(body), send(body)]);
  assert(results.every(r => [200, 409].includes(r.status)));
  assert.equal(sent.length, 2);
});
test("provider uncertainty is recorded without retrying", async () => {
  sent = []; fail = true;
  const body = payload();
  try {
    const result = await send(body);
    assert.equal(result.status, 200);
    assert.equal(result.body.status, "needs_review");
    assert.equal(result.body.uncertain, 2);
    assert.equal(result.body.accepted, 0);
    await send(body);
    assert.equal(sent.length, 2);
  } finally { fail = false; }
});
