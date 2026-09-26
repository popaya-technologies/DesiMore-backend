const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const request = require("supertest");

// Never use the application's configured database for integration tests.
const url = process.env.PRODUCT_TEST_DATABASE_URL;
if (
  !url ||
  !/^postgres(?:ql)?:\/\/[^/]+\/desimore_product_test(?:\?.*)?$/.test(url)
) {
  throw new Error(
    "Set PRODUCT_TEST_DATABASE_URL to an isolated desimore_product_test database",
  );
}
process.env.DATABASE_URL = url;
process.env.DB_SSL = "false";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "product-integration-test-only";
process.env.JWT_REFRESH_SECRET = "product-integration-refresh-only";
process.env.UPLOAD_DIR = ".test-uploads";
process.env.DOWNLOAD_DIR = ".test-downloads";
const { AppDataSource: db } = require("../src/data-source");
const { Product } = require("../src/entities/product.entity");
const { Category } = require("../src/entities/category.entity");
const { Brand } = require("../src/entities/brand.entity");
const { User } = require("../src/entities/user.entity");
const { Role } = require("../src/entities/role.entity");
const { UserRole } = require("../src/entities/user-role.entity");
const { Permission } = require("../src/entities/permission.entity");
const { RolePermission } = require("../src/entities/role-permission.entity");
const { CartItem } = require("../src/entities/cart-item.entity");
const {
  ExpandProductForm1790035200000,
} = require("../src/migrations/1790035200000-ExpandProductForm");
const { generateAccessToken } = require("../src/utils/jwt");
const app = require("../src/app").default;
let api,
  adminCookie,
  customerCookie,
  wholesaleCookie,
  customer2Cookie,
  brand,
  category,
  legacyId;
const address = {
  firstName: "Test",
  lastName: "Buyer",
  email: "test@example.com",
  phone: "+14155552671",
  address: "1 Main St",
  city: "Boston",
  state: "MA",
  country: "US",
  zipCode: "02101",
};
const payload = (overrides = {}) => ({
  title: "Product " + randomUUID(),
  model: "SKU-" + randomUUID(),
  metaTitle: "Product SEO",
  price: 20,
  quantity: 20,
  wholesalePrice: 100,
  wholesaleQuantity: 10,
  boxQuantity: 6,
  brandId: brand.id,
  categoryIds: [category.id],
  summary:
    '<p>Hello <strong>world</strong><script>alert(1)</script><img src="x" onerror="alert(1)"></p>',
  sku: "SKU",
  mpn: "MPN",
  minimumQuantity: 1,
  subtractStock: true,
  outOfStockStatus: "2_3_days",
  requiresShipping: true,
  lengthClass: "inch",
  weightClass: "pound",
  sortOrder: 1,
  isActive: true,
  wholesaleMinimumQuantity: 1,
  wholesaleRequiresShipping: true,
  wholesaleLength: 4,
  wholesaleWidth: 3,
  wholesaleHeight: 2,
  wholesaleWeight: 1,
  wholesaleLengthClass: "inch",
  wholesaleWeightClass: "pound",
  attributes: [{ name: "Material", text: "<p>Steel</p>", sortOrder: 0 }],
  options: [],
  discounts: [],
  imageDetails: [
    { url: "https://example.com/main.jpg", isMain: true, sortOrder: 0 },
    { url: "/catalog/second.jpg", isMain: false, sortOrder: 2 },
  ],
  ...overrides,
});
const call = (method, path, cookie = adminCookie) => {
  const req = api[method](path);
  if (cookie) req.set("Cookie", cookie);
  return req;
};
const create = async (overrides = {}) => {
  const response = await call("post", "/api/products").send(payload(overrides));
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
};
before(async () => {
  await db.initialize();
  // Database is explicitly dedicated to this suite; retain no application data.
  await db.dropDatabase();
  await db.synchronize();
  const runner = db.createQueryRunner();
  const migration = new ExpandProductForm1790035200000();
  await runner.startTransaction();
  try {
    await migration.down(runner);
    await runner.commitTransaction();
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  }
  legacyId = randomUUID();
  await db.query(
    'INSERT INTO products (id,title,price,summary,quantity,images,"wholesaleOrderQuantity") VALUES ($1,$2,10,$3,$4,$5,$6)',
    [
      legacyId,
      "Legacy product",
      "Legacy",
      "5",
      ["https://example.com/old.jpg"],
      "12",
    ],
  );
  await runner.startTransaction();
  try {
    await migration.up(runner);
    await runner.commitTransaction();
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  }
  await runner.release();
  brand = await db.getRepository(Brand).save({ name: "Test Brand", keyword: "test-brand" });
  category = await db
    .getRepository(Category)
    .save({ name: "Test Category", slug: "test-category" });
  async function user(role, i) {
    const u = new User();
    Object.assign(u, {
      firstname: "Test",
      lastname: "Buyer",
      username: "test" + i,
      email: "test" + i + "@example.com",
      phone: "+1415555200" + i,
      userRole: role,
    });
    u.setPassword("test-password");
    await db.getRepository(User).save(u);
    return {
      entity: u,
      cookie:
        "accessToken=" + generateAccessToken({ userId: u.id, email: u.email }),
    };
  }
  adminCookie = (await user("su", 1)).cookie;
  const shopper = await user("user", 2);
  customerCookie = shopper.cookie;
  const shopperRole = await db.getRepository(Role).save({ name: "customer" });
  const shopperRead = await db.getRepository(Permission).save({ name: "read-product", resource: "product", action: "read" });
  await db.getRepository(UserRole).save({ userId: shopper.entity.id, roleId: shopperRole.id });
  await db.getRepository(RolePermission).save({ roleId: shopperRole.id, permissionId: shopperRead.id });
  customer2Cookie = (await user("user", 4)).cookie;
  const wholesale = await user("wholesaler", 3);
  wholesaleCookie = wholesale.cookie;
  const role = await db.getRepository(Role).save({ name: "wholesaler" });
  await db
    .getRepository(UserRole)
    .save({ userId: wholesale.entity.id, roleId: role.id });
  for (const action of ["create", "read"]) {
    const permission = await db
      .getRepository(Permission)
      .save({
        name: action + "-wholesale",
        resource: "wholesale-order-request",
        action,
      });
    await db
      .getRepository(RolePermission)
      .save({ roleId: role.id, permissionId: permission.id });
  }
  api = request(app);
});
after(async () => {
  if (db.isInitialized) await db.destroy();
});
test("migration preserves legacy images and packaging without treating box size as stock", async () => {
  const response = await call("get", "/api/products/" + legacyId + "/edit");
  assert.equal(response.status, 200);
  assert.equal(response.body.boxQuantity, 12);
  assert.equal(response.body.wholesaleQuantity, 0);
  assert.equal(response.body.mainImage, "https://example.com/old.jpg");
  assert.equal(response.body.imageDetails.length, 1);
});
test("product writes and edit metadata require authentication and permission", async () => {
  assert.equal(
    (await call("post", "/api/products", null).send(payload())).status,
    401,
  );
  assert.equal(
    (await call("post", "/api/products", customerCookie).send(payload()))
      .status,
    403,
  );
  assert.equal(
    (await call("get", "/api/products/form-options", customerCookie)).status,
    403,
  );
  assert.equal((await call("get", "/api/products/form-options")).status, 200);
});
test("all form tabs round-trip; rich text is sanitized and related products are explicit", async () => {
  const related = await create();
  const download = await call("post", "/api/downloads").send({
    name: "Manual",
    url: "https://example.com/manual.pdf",
  });
  assert.equal(download.status, 201);
  const product = await create({
    relatedProductIds: [related.id],
    downloadIds: [download.body.id],
    options: [
      {
        name: "Finish",
        type: "checkbox",
        required: true,
        values: [
          {
            value: "Premium",
            quantity: 10,
            subtractStock: true,
            pricePrefix: "+",
            price: 3,
            points: 2,
            weight: 1,
          },
        ],
      },
    ],
    discounts: [
      {
        customerGroup: "default",
        quantity: 3,
        priority: 0,
        price: 15,
        dateStart: "2020-01-01",
        dateEnd: "2099-12-31",
      },
    ],
  });
  assert.equal(product.boxQuantity, 6);
  assert.equal(product.wholesaleOrderQuantity, "6");
  assert.equal(product.wholesaleQuantity, 10);
  assert.ok(
    !product.summary.includes("<script") &&
      !product.summary.includes("onerror"),
  );
  assert.ok(product.summary.includes("<strong>"));
  assert.equal(product.options[0].values[0].price, 3);
  assert.equal(product.discounts.length, 1);
  const edit = await call("get", "/api/products/" + product.id + "/edit");
  assert.equal(edit.body.downloads[0].url, "https://example.com/manual.pdf");
  const publicResult = await call("get", "/api/products/" + product.id, null);
  assert.equal(publicResult.body.downloads[0].url, undefined);
  const relatedResult = await call(
    "get",
    "/api/products/" + product.id + "/related",
    null,
  );
  assert.deepEqual(
    relatedResult.body.map((p) => p.id),
    [related.id],
  );
});
test("partial updates preserve omitted data, switch main image, and clear nested collections", async () => {
  const product = await create();
  const images = product.imageDetails.map((i) => ({
    id: i.id,
    url: i.url,
    isMain: !i.isMain,
    sortOrder: i.sortOrder,
  }));
  const updated = await call("patch", "/api/products/" + product.id).send({
    model: "Changed",
    imageDetails: images,
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.mainImage, "/catalog/second.jpg");
  assert.equal(updated.body.attributes.length, 1);
  assert.equal(updated.body.wholesaleQuantity, 10);
  const cleared = await call("patch", "/api/products/" + product.id).send({
    attributes: [],
    options: [],
    discounts: [],
    imageDetails: [],
    categoryIds: [],
    brandId: null,
    downloadIds: [],
    relatedProductIds: [],
  });
  assert.equal(cleared.status, 200);
  assert.deepEqual(cleared.body.images, []);
  assert.deepEqual(cleared.body.attributes, []);
  assert.equal(cleared.body.brandId, null);
});
test("optional wholesale and brand fields preserve defaults and partial update behavior", async () => {
  for (const field of ["wholesalePrice", "wholesaleQuantity", "brandId"]) {
    const product = await create({ [field]: undefined });
    assert.equal(product[field], field === "wholesaleQuantity" ? 0 : null);
  }
  const response = await call("post", "/api/products").send({
    title: "Retail only", model: "RETAIL-ONLY", metaTitle: "Retail only",
    price: 20, quantity: 10, categoryIds: [category.id],
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const retail = response.body;
  assert.equal(retail.wholesalePrice, null);
  assert.equal(retail.wholesaleQuantity, 0);
  assert.equal(retail.brandId, null);
  const full = await create();
  for (const product of [retail, full]) {
    const disabled = await call("patch", "/api/products/" + product.id)
      .send({ isActive: false });
    assert.equal(disabled.status, 200, JSON.stringify(disabled.body));
    const saved = await db.getRepository(Product).findOneOrFail({
      where: { id: product.id }, relations: ["brand"],
    });
    assert.equal(saved.isActive, false);
    assert.equal(saved.wholesalePrice, product.wholesalePrice);
    assert.equal(saved.wholesaleQuantity, product.wholesaleQuantity);
    assert.equal(saved.brand?.id ?? null, product.brandId);
  }
});
test("validation rejects malformed fields, missing required fields, aliases and invalid dates", async () => {
  const invalid = [
    { title: "" },
    { model: undefined },
    { metaTitle: undefined },
    { quantity: -1 },
    { quantity: 1.5 },
    { wholesaleQuantity: -1 },
    { price: -1 },
    { wholesalePrice: -1 },
    ...["title", "model", "metaTitle", "price", "quantity", "categoryIds"]
      .map((field) => ({ [field]: undefined })),
    { categoryIds: [] },
    { boxQuantity: 0 },
    { manufacturerId: randomUUID() },
    { brandId: randomUUID() },
    { categoryIds: [randomUUID()] },
    { minimumQuantity: 0 },
    { weightClass: "invalid" },
    { dateAvailable: "2026-02-30" },
    { arbitraryField: true },
    { attributes: [{ name: "X", text: 123 }] },
    { options: [{ name: "X", type: "checkbox", required: true, values: [] }] },
    {
      discounts: [
        {
          customerGroup: "default",
          quantity: 1,
          priority: 0,
          price: 1,
          dateStart: "2027-01-01",
          dateEnd: "2026-01-01",
        },
      ],
    },
    {
      imageDetails: [
        { url: "javascript:alert(1)", isMain: true, sortOrder: 0 },
      ],
    },
    {
      imageDetails: [
        { url: "https://example.com/a", isMain: false, sortOrder: 0 },
      ],
    },
    { imageDetails: null },
    { options: null },
    { isActive: null },
  ];
  for (const data of invalid) {
    const result = await call("post", "/api/products").send(payload(data));
    assert.equal(
      result.status,
      400,
      JSON.stringify({ data, body: result.body }),
    );
  }
});
test("invalid nested ID rolls back scalar edits and related row deletion", async () => {
  const product = await create();
  const result = await call("patch", "/api/products/" + product.id).send({
    title: "Must rollback",
    attributes: [{ id: randomUUID(), name: "Bad", text: "Bad" }],
  });
  assert.equal(result.status, 400);
  const fetched = await call("get", "/api/products/" + product.id + "/edit");
  assert.equal(fetched.body.title, product.title);
  assert.equal(fetched.body.attributes.length, 1);
});
test("cart enforces required options, combined stock, tier prices and checkout snapshots", async () => {
  await call("delete", "/api/cart", customerCookie);
  const product = await create({
    quantity: 6,
    requiresShipping: false,
    options: [
      {
        name: "Finish",
        type: "checkbox",
        required: true,
        values: [{ value: "Premium", quantity: 6, price: 3 }],
      },
    ],
    discounts: [
      { customerGroup: "default", quantity: 3, priority: 0, price: 15 },
    ],
  });
  const selection = [
    {
      optionId: product.options[0].id,
      valueIds: [product.options[0].values[0].id],
    },
  ];
  const missing = await call("post", "/api/cart/items", customerCookie).send({
    productId: product.id,
    quantity: 3,
  });
  assert.equal(missing.status, 400);
  const added = await call("post", "/api/cart/items", customerCookie).send({
    productId: product.id,
    quantity: 3,
    selectedOptions: selection,
  });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.equal(Number(added.body.items[0].price), 18);
  const tooMany = await call("post", "/api/cart/items", customerCookie).send({
    productId: product.id,
    quantity: 4,
    selectedOptions: selection,
  });
  assert.equal(tooMany.status, 400);
  const order = await call("post", "/api/orders", customerCookie).send({
    shippingAddress: address,
    paymentMethod: "credit_card",
  });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(Number(order.body.subtotal), 54);
  assert.equal(Number(order.body.shipping), 0);
  assert.equal(order.body.items[0].selectedOptions[0].values[0], "Premium");
  assert.equal(
    (await db.getRepository(Product).findOneBy({ id: product.id })).quantity,
    "3",
  );
  const cancelled = await call(
    "post",
    "/api/orders/" + order.body.id + "/cancel",
    customerCookie,
  ).send({});
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal(
    (await db.getRepository(Product).findOneBy({ id: product.id })).quantity,
    "6",
  );
  await call(
    "post",
    "/api/orders/" + order.body.id + "/cancel",
    customerCookie,
  ).send({});
  assert.equal(
    (await db.getRepository(Product).findOneBy({ id: product.id })).quantity,
    "6",
  );
});
test("minimum quantities, availability, unlimited stock and Buy Now", async () => {
  const product = await create({
    minimumQuantity: 2,
    quantity: 0,
    subtractStock: false,
  });
  assert.equal(
    (
      await call("post", "/api/cart/buy-now", customerCookie).send({
        productId: product.id,
        quantity: 1,
      })
    ).status,
    400,
  );
  const added = await call("post", "/api/cart/buy-now", customerCookie).send({
    productId: product.id,
    quantity: 2,
  });
  assert.equal(added.status, 200);
  const future = await create({ dateAvailable: "2099-01-01" });
  assert.equal(
    (
      await call("post", "/api/cart/buy-now", customerCookie).send({
        productId: future.id,
        quantity: 1,
      })
    ).status,
    400,
  );
  const order = await call("post", "/api/orders", customerCookie).send({
    shippingAddress: address,
    paymentMethod: "credit_card",
    cartId: added.body.id,
  });
  assert.equal(order.status, 201);
  assert.equal(
    (await db.getRepository(Product).findOneBy({ id: product.id })).quantity,
    "0",
  );
});
test("wholesale stock is independent; requests snapshot boxes and restore rejected stock", async () => {
  const product = await create({
    quantity: 0,
    wholesaleQuantity: 8,
    wholesaleRequiresShipping: false,
    wholesaleMinimumQuantity: 2,
  });
  assert.equal(
    (
      await call("post", "/api/cart/items", wholesaleCookie).send({
        productId: product.id,
        quantity: 1,
      })
    ).status,
    400,
  );
  const added = await call("post", "/api/cart/items", wholesaleCookie).send({
    productId: product.id,
    quantity: 2,
  });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  const order = await call(
    "post",
    "/api/wholesale-orders",
    wholesaleCookie,
  ).send({ shippingAddress: address });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(order.body.items[0].totalUnits, 12);
  assert.equal(Number(order.body.total), 196);
  assert.equal(
    (await db.getRepository(Product).findOneBy({ id: product.id }))
      .wholesaleQuantity,
    6,
  );
  const rejected = await call(
    "patch",
    "/api/wholesale-orders/" + order.body.id + "/status",
  ).send({ status: "rejected" });
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
  assert.equal(
    (await db.getRepository(Product).findOneBy({ id: product.id }))
      .wholesaleQuantity,
    8,
  );
});
test("concurrent checkouts cannot oversell", async () => {
  await call("delete", "/api/cart", customerCookie);
  const product = await create({ quantity: 1, requiresShipping: false });
  for (const cookie of [customerCookie, customer2Cookie]) {
    const cart = await call("post", "/api/cart/items", cookie).send({
      productId: product.id,
      quantity: 1,
    });
    assert.equal(cart.status, 200);
  }
  const results = await Promise.all(
    [customerCookie, customer2Cookie].map((cookie) =>
      call("post", "/api/orders", cookie).send({
        shippingAddress: address,
        paymentMethod: "credit_card",
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
  assert.equal(
    (await db.getRepository(Product).findOneBy({ id: product.id })).quantity,
    "0",
  );
});
test("product deletion cascades nested data and returns 404 for a missing product", async () => {
  const product = await create();
  assert.equal(
    (await call("delete", "/api/products/" + product.id)).status,
    200,
  );
  assert.equal(
    (await call("get", "/api/products/" + product.id + "/edit")).status,
    404,
  );
  const rows = await db.query(
    'SELECT count(*)::int AS count FROM product_attributes WHERE "productId" = $1',
    [product.id],
  );
  assert.equal(rows[0].count, 0);
});

test("imports preserve new fields, sync images, support new columns and report row errors", async () => {
  const XLSX = require("xlsx");
  const product = await create({
    wholesaleQuantity: 27,
    wholesalePrice: 123,
    sku: "KEEP-SKU",
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        title: product.title,
        price: 30,
        images: "https://example.com/import.jpg",
      },
      { title: "Invalid row", price: -5 },
      {
        title: "New imported product",
        price: 10,
        quantity: 7,
        wholesaleQuantity: 4,
        wholesalePrice: 70,
        boxQuantity: 12,
      },
    ]),
    "Products",
  );
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const result = await call("post", "/api/products/imports").attach(
    "file",
    buffer,
    "products.xlsx",
  );
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.updated, 1);
  assert.equal(result.body.created, 1);
  assert.equal(result.body.errors.length, 1);
  const edit = await call("get", "/api/products/" + product.id + "/edit");
  assert.equal(edit.body.wholesaleQuantity, 27);
  assert.equal(Number(edit.body.wholesalePrice), 123);
  assert.equal(edit.body.sku, "KEEP-SKU");
  assert.equal(edit.body.attributes.length, 1);
  assert.equal(edit.body.mainImage, "https://example.com/import.jpg");
  assert.equal(edit.body.imageDetails.length, 1);
});
test("product listing sorts globally before pagination", async () => {
  const uniqueCategory = await db
    .getRepository(Category)
    .save({ name: "Sort Category", slug: "sort-category" });
  const products = [];
  for (const price of [90, 10, 50])
    products.push(await create({ price, categoryIds: [uniqueCategory.id] }));
  const first = await call(
    "get",
    "/api/products?category=" +
      uniqueCategory.id +
      "&sort=price_asc&limit=1&page=1",
    null,
  );
  const second = await call(
    "get",
    "/api/products?category=" +
      uniqueCategory.id +
      "&sort=price_asc&limit=1&page=2",
    null,
  );
  assert.equal(first.body.data[0].id, products[1].id);
  assert.equal(second.body.data[0].id, products[2].id);
});
test("uploads use unique filenames and reject unsupported files and excessive counts", async () => {
  const image = Buffer.from("89504e470d0a1a0a", "hex");
  const first = await call("post", "/api/uploads/image", customerCookie).attach(
    "file",
    image,
    { filename: "image.png", contentType: "image/png" },
  );
  const second = await call(
    "post",
    "/api/uploads/image",
    customerCookie,
  ).attach("file", image, { filename: "image.png", contentType: "image/png" });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.body.filename, second.body.filename);
  assert.equal(
    (
      await call("post", "/api/uploads/image", customerCookie).attach(
        "file",
        Buffer.from("bad"),
        "bad.txt",
      )
    ).status,
    400,
  );
  let excessive = call("post", "/api/uploads/images", customerCookie);
  for (let i = 0; i < 11; i++)
    excessive = excessive.attach("images", image, {
      filename: i + ".png",
      contentType: "image/png",
    });
  assert.equal((await excessive).status, 400);
});
test("downloads can be uploaded, linked, listed and accessed only by admin or paid buyer", async () => {
  const uploaded = await call("post", "/api/downloads/upload")
    .field("name", "Manual.pdf")
    .attach("file", Buffer.from("%PDF-1.4\nTest manual\n%%EOF"), {
      filename: "manual.pdf",
      contentType: "application/pdf",
    });
  assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
  assert.equal(uploaded.body.storagePath, undefined);
  assert.equal((await call("get", uploaded.body.url)).status, 200);
  assert.equal((await call("get", uploaded.body.url, null)).status, 401);
  assert.equal(
    (await call("get", uploaded.body.url, customerCookie)).status,
    403,
  );
  const product = await create({
    downloadIds: [uploaded.body.id],
    requiresShipping: false,
  });
  await call("delete", "/api/cart", customerCookie);
  await call("post", "/api/cart/items", customerCookie).send({
    productId: product.id,
    quantity: 1,
  });
  const order = await call("post", "/api/orders", customerCookie).send({
    shippingAddress: address,
    paymentMethod: "credit_card",
  });
  assert.equal(order.status, 201);
  const { Order } = require("../src/entities/order.entity");
  await db
    .getRepository(Order)
    .update(order.body.id, { paymentStatus: "completed" });
  const buyer = await call("get", uploaded.body.url, customerCookie);
  assert.equal(buyer.status, 200, JSON.stringify(buyer.body));
  assert.equal(
    (await call("get", uploaded.body.url, customer2Cookie)).status,
    403,
  );
});
test("payment checkout charges server prices, supports declined retry and prevents duplicate charges", async () => {
  const SDK = require("authorizenet");
  const original = SDK.APIControllers.CreateTransactionController;
  let responseCode = "2",
    charges = 0,
    chargedAmount;
  SDK.APIControllers.CreateTransactionController = class {
    constructor(json) {
      chargedAmount = json.createTransactionRequest.transactionRequest.amount;
    }
    setEnvironment() {}
    execute(cb) {
      charges++;
      cb();
    }
    getResponse() {
      return {
        transactionResponse: {
          responseCode,
          authCode: "TEST",
          transId: "TEST-" + charges,
          accountNumber: "XXXX1111",
          accountType: "Visa",
          errors:
            responseCode === "2"
              ? [{ errorCode: "2", errorText: "Declined" }]
              : undefined,
        },
        messages: {
          resultCode: "Ok",
          message: [{ code: "I00001", text: "Successful." }],
        },
      };
    }
  };
  try {
    await call("delete", "/api/cart", customerCookie);
    const product = await create({ price: 30, requiresShipping: false });
    await call("post", "/api/cart/items", customerCookie).send({
      productId: product.id,
      quantity: 2,
    });
    const paymentData = {
      cardNumber: "4111111111111111",
      expirationDate: "12/29",
      cardCode: "123",
      amount: 1,
    };
    const declined = await call(
      "post",
      "/api/payments/process",
      customerCookie,
    ).send({
      ...paymentData,
      shippingAddress: address,
      paymentMethod: "credit_card",
    });
    assert.equal(declined.status, 400, JSON.stringify(declined.body));
    assert.ok(declined.body.orderId);
    assert.equal(Number(chargedAmount), 60);
    assert.equal(
      (await db.getRepository(Product).findOneBy({ id: product.id })).quantity,
      "18",
    );
    responseCode = "1";
    const paid = await call(
      "post",
      "/api/payments/process",
      customerCookie,
    ).send({ ...paymentData, orderId: declined.body.orderId });
    assert.equal(paid.status, 200, JSON.stringify(paid.body));
    assert.equal(paid.body.payment.status, "completed");
    assert.equal(paid.body.order.paymentStatus, "completed");
    const again = await call(
      "post",
      "/api/payments/process",
      customerCookie,
    ).send({ ...paymentData, orderId: declined.body.orderId });
    assert.equal(again.status, 409);
    assert.equal(charges, 2);
    assert.equal(
      (
        await call(
          "post",
          "/api/orders/" + declined.body.orderId + "/cancel",
          customerCookie,
        ).send({})
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          "put",
          "/api/orders/" + declined.body.orderId + "/payment-status",
          customer2Cookie,
        ).send({ paymentStatus: "completed" })
      ).status,
      403,
    );
  } finally {
    SDK.APIControllers.CreateTransactionController = original;
  }
});
test("unknown payment outcomes remain processing and cannot be charged or cancelled again", async () => {
  const SDK = require("authorizenet");
  const original = SDK.APIControllers.CreateTransactionController;
  SDK.APIControllers.CreateTransactionController = class {
    setEnvironment() {}
    execute() {
      throw new Error("Simulated transport interruption");
    }
  };
  try {
    await call("delete", "/api/cart", customerCookie);
    const product = await create();
    await call("post", "/api/cart/items", customerCookie).send({
      productId: product.id,
      quantity: 1,
    });
    const data = {
      cardNumber: "4111111111111111",
      expirationDate: "12/29",
      cardCode: "123",
    };
    const result = await call(
      "post",
      "/api/payments/process",
      customerCookie,
    ).send({ ...data, shippingAddress: address, paymentMethod: "credit_card" });
    assert.equal(result.status, 502);
    assert.ok(result.body.orderId);
    const retry = await call(
      "post",
      "/api/payments/process",
      customerCookie,
    ).send({ ...data, amount: 1, orderId: result.body.orderId });
    assert.equal(retry.status, 409);
    assert.equal(
      (
        await call(
          "post",
          "/api/orders/" + result.body.orderId + "/cancel",
          customerCookie,
        ).send({})
      ).status,
      400,
    );
  } finally {
    SDK.APIControllers.CreateTransactionController = original;
  }
});


test("editor/download metadata is blocked for seeded shoppers with product read permission", async () => {
 const product = await create();
 assert.equal((await call("get", "/api/products/" + product.id + "/edit", customerCookie)).status, 403);
 assert.equal((await call("get", "/api/downloads", customerCookie)).status, 403);
 assert.equal((await call("get", "/api/products/not-a-uuid", null)).status, 400);
});

test("option edits preserve IDs; date and signed adjustments are validated at checkout", async () => {
 await call("delete", "/api/cart", customerCookie);
 const product = await create({
  options: [
   { name: "Finish", type: "radio", required: true, values: [{ value: "Basic", quantity: 10, pricePrefix: "-", price: 2, pointsPrefix: "-", points: 1, weightPrefix: "+", weight: 0.5 }] },
   { name: "Delivery date", type: "date", required: true, values: [] }
  ],
  discounts: [{ customerGroup: "default", quantity: 2, priority: 1, price: 16, dateStart: "2020-01-01", dateEnd: "2099-01-01" },
   { customerGroup: "default", quantity: 2, priority: 0, price: 15 },
   { customerGroup: "default", quantity: 2, priority: 0, price: 1, dateEnd: "2020-01-01" }]
 });
 const choice = product.options.find(o => o.type === "radio"), date = product.options.find(o => o.type === "date");
 const options = product.options.map(o => ({ id: o.id, name: o.name, type: o.type, required: o.required, sortOrder: o.sortOrder, values: o.values }));
 const edit = await call("patch", "/api/products/" + product.id).send({ options });
 assert.equal(edit.status, 200, JSON.stringify(edit.body));
 assert.equal(edit.body.options.find(o => o.type === "radio").values[0].id, choice.values[0].id);
 const selectedOptions = [{ optionId: choice.id, valueIds: [choice.values[0].id] }, { optionId: date.id, text: "2026-02-30" }];
 assert.equal((await call("post", "/api/cart/items", customerCookie).send({ productId: product.id, quantity: 2, selectedOptions })).status, 400);
 selectedOptions[1].text = "2026-12-25";
 const added = await call("post", "/api/cart/items", customerCookie).send({ productId: product.id, quantity: 2, selectedOptions });
 assert.equal(added.status, 200, JSON.stringify(added.body));
 assert.equal(Number(added.body.items[0].price), 13);
 assert.equal(added.body.items[0].selectedOptions.find(o => o.optionId === choice.id).pointsAdjustment, -1);
});

test("cart fetch refreshes current prices and reports unavailable items without blocking removal", async () => {
 await call("delete", "/api/cart", customerCookie);
 const product = await create();
 await call("post", "/api/cart/items", customerCookie).send({ productId: product.id, quantity: 1 });
 await call("patch", "/api/products/" + product.id).send({ price: 25 });
 let cart = await call("get", "/api/cart", customerCookie);
 assert.equal(Number(cart.body.items[0].price), 25);
 await call("patch", "/api/products/" + product.id).send({ isActive: false });
 cart = await call("get", "/api/cart", customerCookie);
 assert.equal(cart.status, 200);
 assert.equal(cart.body.validationErrors.length, 1);
 assert.equal((await call("delete", "/api/cart/items/" + cart.body.items[0].id, customerCookie)).status, 200);
});
