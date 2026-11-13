const test = require("node:test");
const assert = require("node:assert/strict");
const { NewsletterService } = require("../src/services/newsletter.service");

const fixture = () => {
  const records = new Map();
  const repository = {
    async upsert(value) { records.set(value.email, { ...value }); },
    async findOneBy({ email }) { return records.get(email) || null; },
  };
  const db = { getRepository: () => repository };
  return { service: new NewsletterService(db), records };
};

test("newsletter signup normalizes and activates an email", async () => {
  const { service, records } = fixture();
  const result = await service.setPreference("  Customer@Example.COM ", true);
  assert.deepEqual(result, { email: "customer@example.com", subscribed: true });
  assert.equal(records.get("customer@example.com").isActive, true);
});

test("newsletter preference can be disabled and re-enabled", async () => {
  const { service } = fixture();
  await service.setPreference("customer@example.com", false);
  assert.equal((await service.getPreference("customer@example.com")).subscribed, false);
  await service.setPreference("customer@example.com", true);
  assert.equal((await service.getPreference("customer@example.com")).subscribed, true);
});

test("an unknown email is reported as unsubscribed", async () => {
  const { service } = fixture();
  assert.deepEqual(await service.getPreference("new@example.com"), {
    email: "new@example.com",
    subscribed: false,
  });
});
