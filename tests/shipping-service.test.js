const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateRetailShippingWeight,
  retailCartRequiresShipping,
} = require("../src/services/shipping.service");
const {
  getMockShippingQuote,
  getMockShippingQuotes,
} = require("../src/services/shipping-quote.service");
const { freight } = require("../src/services/product-pricing.service");
const { ShippingController } = require("../src/controllers/shipping.controller");
const { AppDataSource } = require("../src/data-source");

const item = ({ weight, weightClass = "pound", quantity = 1, requiresShipping = true, adjustments = [] }) => ({
  quantity,
  product: { weight, weightClass, requiresShipping },
  selectedOptions: adjustments.map((weightAdjustment) => ({ weightAdjustment })),
});

test("retail weight includes signed option adjustments and quantity once", () => {
  const cart = { items: [item({ weight: 10, quantity: 2, adjustments: [2, -1] })] };
  assert.equal(calculateRetailShippingWeight(cart), 22);
});

test("retail weight converts supported units to pounds", () => {
  const cart = { items: [item({ weight: 1, weightClass: "kilogram" }), item({ weight: 16, weightClass: "ounce" })] };
  assert.equal(calculateRetailShippingWeight(cart), 3.2);
});

test("non-shippable products are excluded and need no method", () => {
  const cart = { items: [item({ weight: 30, requiresShipping: false })] };
  assert.equal(calculateRetailShippingWeight(cart), 0);
  assert.equal(retailCartRequiresShipping(cart), false);
  assert.deepEqual(getMockShippingQuotes(0), []);
});

test("mock UPS rates reproduce the legacy 30 lb examples", () => {
  assert.deepEqual(
    getMockShippingQuotes(30).map(({ shippingCode, price }) => [shippingCode, price]),
    [["ups.03", 246.48], ["ups.12", 665.91], ["ups.02", 860.65], ["ups.01", 1082.44]],
  );
});

test("invalid shipping selections are rejected", () => {
  assert.throws(() => getMockShippingQuote(30, "ups.fake"), /Invalid or unavailable/);
});

test("existing wholesale freight tiers remain unchanged", () => {
  assert.equal(freight(1199), 199);
  assert.equal(freight(1200), 150);
  assert.equal(freight(3500), 0);
});

const requestBody = {
  cartId: "11111111-1111-4111-8111-111111111111",
  shippingAddress: {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "+14155552671",
    address: "123 Main Street",
    city: "Los Angeles",
    state: "CA",
    country: "US",
    zipCode: "90001",
  },
};

const responseRecorder = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("quote endpoint returns the four server-calculated methods", async (t) => {
  const original = AppDataSource.getRepository;
  t.after(() => { AppDataSource.getRepository = original; });
  AppDataSource.getRepository = () => ({
    findOne: async () => ({
      id: requestBody.cartId,
      items: [item({ weight: 30 })],
    }),
  });
  const res = responseRecorder();
  await ShippingController.quote(
    { body: requestBody, user: { id: "22222222-2222-4222-8222-222222222222", userRole: "customer", roles: [] } },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.shippingMethods.length, 4);
  assert.equal(res.body.shippingMethods[0].price, 246.48);
});

test("quote endpoint rejects a missing cart", async (t) => {
  const original = AppDataSource.getRepository;
  t.after(() => { AppDataSource.getRepository = original; });
  AppDataSource.getRepository = () => ({ findOne: async () => null });
  const res = responseRecorder();
  await ShippingController.quote(
    { body: requestBody, user: { id: "22222222-2222-4222-8222-222222222222", userRole: "customer", roles: [] } },
    res,
  );
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Cart not found");
});

test("quote endpoint rejects invalid addresses", async () => {
  const res = responseRecorder();
  await ShippingController.quote(
    { body: { ...requestBody, shippingAddress: { ...requestBody.shippingAddress, zipCode: "bad" } }, user: { id: "22222222-2222-4222-8222-222222222222", userRole: "customer", roles: [] } },
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Invalid United States ZIP code");
});
