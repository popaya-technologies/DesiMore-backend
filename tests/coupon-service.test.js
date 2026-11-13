const test = require("node:test");
const assert = require("node:assert/strict");
const { Coupon } = require("../src/entities/coupon.entity");
const { calculateCoupon } = require("../src/services/coupon.service");

const baseCoupon = (overrides = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Coupon",
  code: "SAVE10",
  type: "Percentage",
  discount: 10,
  totalAmount: 0,
  customerLogin: false,
  freeShipping: false,
  productIds: [],
  categoryIds: [],
  dateStart: "2000-01-01",
  dateEnd: "2099-12-31",
  usesPerCoupon: 0,
  usesPerCustomer: 0,
  isActive: true,
  ...overrides,
});

const cart = {
  items: [
    {
      productId: "22222222-2222-4222-8222-222222222222",
      price: 40,
      quantity: 2,
      product: { categories: [{ id: "33333333-3333-4333-8333-333333333333" }] },
    },
    {
      productId: "44444444-4444-4444-8444-444444444444",
      price: 20,
      quantity: 1,
      product: { categories: [] },
    },
  ],
};

const managerFor = (coupon, totalUses = 0, customerUses = 0) => ({
  getRepository(entity) {
    if (entity === Coupon) {
      return {
        createQueryBuilder() {
          return {
            where() { return this; },
            setLock() { return this; },
            async getOne() { return coupon; },
          };
        },
      };
    }
    return {
      async countBy(where) {
        return where.userId ? customerUses : totalUses;
      },
    };
  },
});

test("percentage coupon calculates against the server cart subtotal", async () => {
  const result = await calculateCoupon(managerFor(baseCoupon()), " save10 ", cart, "user-id");
  assert.equal(result.subtotal, 100);
  assert.equal(result.discount, 10);
  assert.equal(result.totalAfterDiscount, 90);
});

test("fixed coupon is capped at the eligible product subtotal", async () => {
  const coupon = baseCoupon({
    type: "Fixed Amount",
    discount: 100,
    productIds: ["44444444-4444-4444-8444-444444444444"],
  });
  const result = await calculateCoupon(managerFor(coupon), "SAVE10", cart, "user-id");
  assert.equal(result.eligibleSubtotal, 20);
  assert.equal(result.discount, 20);
});

test("category restrictions include only matching products", async () => {
  const coupon = baseCoupon({
    categoryIds: ["33333333-3333-4333-8333-333333333333"],
  });
  const result = await calculateCoupon(managerFor(coupon), "SAVE10", cart, "user-id");
  assert.equal(result.eligibleSubtotal, 80);
  assert.equal(result.discount, 8);
});

test("minimum cart total does not block coupon application", async () => {
  const coupon = baseCoupon({ totalAmount: 101 });
  const result = await calculateCoupon(managerFor(coupon), "SAVE10", cart, "user-id");
  assert.equal(result.discount, 10);
});

test("global and per-customer usage limits are enforced", async () => {
  await assert.rejects(
    calculateCoupon(managerFor(baseCoupon({ usesPerCoupon: 1 }), 1), "SAVE10", cart, "user-id"),
    /usage limit/i,
  );
  await assert.rejects(
    calculateCoupon(managerFor(baseCoupon({ usesPerCustomer: 1 }), 0, 1), "SAVE10", cart, "user-id"),
    /already used/i,
  );
});

test("inactive and expired coupons are rejected", async () => {
  await assert.rejects(
    calculateCoupon(managerFor(baseCoupon({ isActive: false })), "SAVE10", cart, "user-id"),
    /not active/i,
  );
  await assert.rejects(
    calculateCoupon(managerFor(baseCoupon({ dateEnd: "2001-01-01" })), "SAVE10", cart, "user-id"),
    /expired/i,
  );
});
