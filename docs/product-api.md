# Product form API

The API supports all eight tabs in the supplied product form. Source files remain under the existing controllers, dto, entities, routes, services, utils, and migrations directories. Run commands from `C:\DesiMore-backend\DesiMore-backend`.

## Business conventions

- Manufacturer uses the existing Brand entity and `/api/brands`.
- `wholesaleQuantity` is available wholesale stock, independent of retail `quantity`. Wholesale stock and order quantities are measured in **boxes**, consistent with the existing requested-boxes workflow.
- `boxQuantity` is units per box. It aliases `unitsPerCarton`. The legacy `wholesaleOrderQuantity` remains a packaging alias; it is never wholesale stock.
- Wholesale price remains **per box**, preserving existing pricing behavior. For 2 boxes at 100 each and 6 units per box: subtotal = 200, total units = 12. The existing 2% wholesale discount then applies.
- Attributes and options are entered per product. No global attribute/option master is required.
- Discount groups are `default` and `wholesaler`. A user's wholesale group is derived from authenticated roles, not a client-supplied group.
- Option points and weight adjustments are stored and snapshotted. This change does not add a rewards-points account or carrier-rate integration.
- Out-of-stock status is a display label; it does not enable backorders. Retail `inStock` remains a manual availability flag. `subtractStock=false` disables retail quantity limits/deduction; wholesale inventory is always tracked.
- Availability/discount dates are date-only `YYYY-MM-DD`, evaluated using the UTC calendar date. An omitted availability date means immediately available.

## Endpoints

Authentication uses the existing `accessToken` cookie.

| Method | Endpoint | Purpose / permission |
|---|---|---|
| POST | /api/products | Create all tabs; product:create |
| PATCH | /api/products/:id | Partial update; product:update |
| GET | /api/products/:id/edit | Complete editable data; product:create or product:update |
| GET | /api/products/form-options | Supported dropdown values and lookup endpoints; product:create or product:update |
| GET | /api/products | Existing public paginated listing |
| GET | /api/products/:id | Product details, nested attributes/options/discounts/images; download URLs omitted |
| GET | /api/products/search?q=... | Existing public search |
| GET | /api/products/:id/related | Selected related products when present; otherwise category/brand fallback |
| DELETE | /api/products/:id | Delete; product:delete; referenced order/cart products may prevent deletion |
| POST | /api/products/imports | XLSX/CSV multipart field `file`; product:create |
| POST | /api/uploads/image | Image upload; authenticated; field `file` or `image` |
| POST | /api/uploads/images | Multiple image upload; authenticated |
| GET | /api/downloads | Download registry; product:create or product:update |
| POST | /api/downloads | Register `{name,url}`; product:create |
| POST | /api/downloads/upload | Upload PDF/ZIP using multipart `file`, optional `name`; product:create |
| GET | /api/downloads/:id/content | File/redirect; product editor, super-admin, or buyer with a completed retail payment |
| DELETE | /api/downloads/:id | Remove registry entry and product links; product:delete |

Ordinary customer product-read permission does not grant access to product editor data or download management. Existing `su` bypass now works because authentication selects `userRole`.

## Form field mapping

| Tab | Fields |
|---|---|
| General | `title`, `summary`, `metaTitle`, `metaDescription`, `metaKeyword`, `tag` |
| Data | `model`, `sku`, `mpn`, `price`, `quantity`, `minimumQuantity`, `subtractStock`, `outOfStockStatus`, `requiresShipping`, `dateAvailable`, `length`, `width`, `height`, `lengthClass`, `weight`, `weightClass`, `sortOrder`, `isActive` |
| Wholesaler | `wholesalePrice`, `wholesaleQuantity`, `boxQuantity`, `wholesaleMinimumQuantity`, `wholesaleRequiresShipping`, `wholesaleDateAvailable`, `wholesaleLength`, `wholesaleWidth`, `wholesaleHeight`, `wholesaleLengthClass`, `wholesaleWeight`, `wholesaleWeightClass` |
| Links | `brandId` or `manufacturerId`, `categoryIds`, `downloadIds`, `relatedProductIds` |
| Attribute | `attributes: [{id?,name,text,sortOrder?}]` |
| Option | `options: [{id?,name,type,required,sortOrder?,values:[...]}]` |
| Discount | `discounts: [{id?,customerGroup,quantity,priority,price,dateStart?,dateEnd?}]` |
| Image | `imageDetails: [{id?,url,isMain,sortOrder}]` |

Create requires title, model, metaTitle, price, quantity, and at least one category. Description is optional and defaults to an empty string. Wholesale price, wholesale quantity, and manufacturer/brand are optional: omitted wholesalePrice remains null, wholesaleQuantity defaults to 0, and the Brand relation remains null. Supplied values still undergo the existing validation. PATCH can disable a product with only `{ "isActive": false }`; omitted wholesale and brand fields remain unchanged.

Accepted aliases: `productName → title`, `description → summary`, `manufacturerId → brandId`, `boxQuantity → unitsPerCarton`. Conflicting aliases are rejected. The existing `discountPrice`, `inStock`, `images`, and `package` fields remain supported.

See [product-create.example.json](product-create.example.json) for a complete request. Replace manufacturer/category UUID placeholders with IDs from the lookup endpoints before sending it.

Numeric request fields use JSON numbers except retail `quantity` and legacy `wholesaleOrderQuantity`, which also accept integer strings. Retail quantity remains a string in storage/responses for compatibility. PostgreSQL decimal fields can be strings in responses; the frontend should convert them for numeric inputs.

Dropdown values:

- Length: `inch`, `centimeter`, `millimeter`.
- Weight: `pound`, `kilogram`, `gram`, `ounce`.
- Out of stock: `out_of_stock`, `in_stock`, `pre_order`, `2_3_days` (display “2–3 Days”).
- Option types: `checkbox`, `select`, `radio`, `text`, `textarea`, `date`, `time`, `datetime`.
- Prefixes: `+` or `-`; adjustment amounts themselves must be nonnegative.

## Editing and validation

- Omitted PATCH properties remain unchanged.
- A supplied nested collection replaces that collection. Include existing child IDs to retain them; omit IDs for new rows. Rows not included are removed.
- An empty array clears a collection, including categories. Null is rejected for collections.
- Nullable scalar properties can be cleared with null; required scalar fields cannot.
- A nonempty image collection must have exactly one main image. Image URLs must be HTTP(S) URLs or local `/uploads/` or `/catalog/` paths.
- Legacy `images: string[]` remains accepted; its first image becomes main. Send either `images` or `imageDetails`, not both. Both representations stay synchronized in storage.
- `package` remains a legacy alias for retail length/width/height.
- Description and attribute rich text are sanitized; scripts, event handlers, and unsafe URL schemes are removed.
- Negative prices/stock, fractional quantities, invalid dates/units, unknown fields, invalid references, duplicate IDs and self-related products are rejected.
- Choice options need at least one value. Text/date options use `values: []`.
- Use request fields only when saving an edit. Server response metadata such as `productId`, timestamps, and derived fields should not be echoed back.
- Product and nested writes run in one transaction. Invalid nested data rolls back the entire update.

## Cart, pricing, and orders

Cart and Buy Now accept selected options:

```json
{
  "productId": "PRODUCT_UUID",
  "quantity": 2,
  "selectedOptions": [
    { "optionId": "OPTION_UUID", "valueIds": ["VALUE_UUID"] },
    { "optionId": "TEXT_OPTION_UUID", "text": "Gift message" }
  ]
}
```

Use IDs returned by the product details/edit response. Required options are enforced; radio/select accept one value, checkbox accepts multiple. Client-provided price adjustments are not accepted.

Identical product/option selections merge into one cart line. Different selections stay separate. Product and option stock limits account for combined lines. Minimum quantities and discount thresholds apply per cart line.

Active discount rules are matched by customer group and date, then ordered by largest qualifying quantity, lowest priority number, and lowest price. The selected discount is a replacement unit/box price, not a percentage. Option adjustments are added afterward. If no rule matches, retail uses `discountPrice ?? price`; wholesale uses `wholesalePrice`.

GET cart refreshes valid current prices. If a product has become unavailable, it returns `validationErrors` while allowing the customer to inspect/remove items. Checkout always reloads prices and validates stock. Cart update/removal supports `?type=buy-now` in addition to the regular cart.

Retail shipping remains 50 when the subtotal is at most 500, free above 500. Orders with no shipping-required items have zero shipping. Wholesale retains the existing freight tiers after its 2% discount; nonshipping wholesale requests have zero freight. Tax remains zero.

Orders snapshot option labels and price/points/weight adjustments. Stock is reserved transactionally when a pending retail order or wholesale request is created. Unpaid retail cancellation and wholesale rejection restore recorded stock exactly once. Pending orders retain their reservations until cancelled; no automatic expiry job is introduced. Refunds do not automatically restock returned goods.

Payment checkout now persists the pending order before contacting Authorize.Net, so an external charge cannot exist without an order record. A declined payment returns `orderId`; retry using that ID. Ambiguous gateway outcomes remain `processing` and return HTTP 502 with the order ID for reconciliation. They cannot be automatically retried or cancelled. Retries use the server order total, ignoring the supplied amount. Do not create another checkout for an ambiguous payment.

Wholesale request status transitions: pending → approved/rejected; approved → delivered/rejected. Rejected/delivered requests cannot be reopened. The status route now matches the existing seeded `update-status` permission.

## Files and downloads

Images: 5 MB per file, maximum 10 per request, JPEG/PNG/WebP/GIF; filenames are unique. Image files continue to be publicly served.

Download uploads: PDF/ZIP only, 20 MB, one file. They are stored under `private-downloads` or `DOWNLOAD_DIR` and served through the authenticated content endpoint. Uploaded files are not exposed through the static image route. Registry deletion retains physical files for recovery.

Externally registered download URLs remain governed by their external hosting access rules; redirecting through this API cannot make an already-public external URL private.

## Import compatibility

Existing spreadsheets can still create products with title and price; the stricter form-only required fields do not invalidate legacy imports. Missing/blank columns preserve existing values when updating. Old imports do not erase wholesale stock/prices, options, attributes, discounts, or image metadata.

New scalar fields can be supplied as columns. Booleans accept true/false, yes/no, 1/0. ID lists accept comma-separated UUIDs or JSON arrays. Nested fields (`attributes`, `options`, `discounts`, `imageDetails`, `package`) accept JSON cell values. Images accept a single URL or JSON string array. Each valid row is transactional; invalid rows return row-numbered errors. Maximum 5,000 rows and 5 MB.

## Migration and rollout

Migration: `1790035200000-ExpandProductForm`.

It adds the product fields and related tables, image backfill, download registry, option snapshots, and inventory reservation records. Legacy image order and packaging values are preserved. Existing products receive **zero wholesale stock** because no reliable independent wholesale-stock value previously existed; populate `wholesaleQuantity` before accepting new wholesale requests.

The repository already assumes an existing database and does not include a complete initial-schema migration. Verify that earlier migrations are recorded/applied on the intended database. This implementation was tested on a separate local database; the application's configured database has not been migrated.

```powershell
npm run build
npm run migration:show
npm run migration:run
npm run dev
```

Migration commands use the configured environment. Production uses `NODE_ENV=production`, compiled entities/migrations in `dist`, and `npm start`. The migration has a down method, but reverting removes the new form data; take a database backup before rollout/revert.

## Verification

```powershell
npm run typecheck
$env:PRODUCT_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55439/desimore_product_test'
npm run test:products
npm run build
```

Use Node.js 22.8+ for the test runner's isolation flag. The test suite requires a dedicated PostgreSQL database named `desimore_product_test` and clears that database. It never reads the application's database connection as its test target. Create the isolated database before running tests.

20 integration tests passed against PostgreSQL 18: migration down/up and legacy backfill, all-tab creation/read/edit, permissions, nested rollback, validation, imports, global sorting, uploads/download access, option pricing, minimum quantities, Buy Now, wholesale stock and rejection, concurrent checkout, deletion, and payment retry/unknown-outcome handling.

Authorize.Net controllers are replaced with simulated responses in payment tests. No external charge, email, or production-database write is made. Live Authorize.Net sandbox verification and frontend end-to-end testing remain separate deployment checks.
