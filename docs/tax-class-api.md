# Tax Classes API

Execute `docs/tax-class-schema.sql` manually in pgAdmin before using the APIs. No database connection, table creation, migration, or seed is run by this change. Grant the four new permissions through existing role management. Existing accessToken cookie authentication and superadmin bypass apply.

| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | `/api/tax-classes` | tax-class:read |
| GET | `/api/tax-classes/export?format=csv` | tax-class:read |
| GET | `/api/tax-classes/tax-rates` | tax-class:read |
| POST | `/api/tax-classes/tax-rates` | tax-class:create |
| GET | `/api/tax-classes/:id` | tax-class:read |
| POST | `/api/tax-classes` | tax-class:create |
| PUT or PATCH | `/api/tax-classes/:id` | tax-class:update |
| DELETE | `/api/tax-classes/:id` | tax-class:delete |
| DELETE | `/api/tax-classes/bulk` | tax-class:delete |

## Form contract

```json
{
  "title": "Standard Goods",
  "description": "Configured tax rules for standard goods",
  "rules": [
    {
      "taxRateId": "replace-with-rate-uuid",
      "basedOn": "shipping",
      "priority": 1
    }
  ]
}
```

Title and description are required on creation: trimmed nonblank strings, max 255 and 10,000 characters respectively. Titles are case-sensitive unique. `rules` is optional, default empty; max 100 rows. Each rate ID must exist. Address basis: `shipping` = Shipping Address, `payment` = Payment/Billing Address, `store` = Store Address. Omitted basis defaults to shipping; priority defaults to 1, integer 0–2147483647. Same rate/basis combination cannot repeat. Send JSON numeric priorities, not strings. Nulls, unknown fields, invalid nested data and empty update bodies return 400.

Both PUT/PATCH allow partial updates. Omitted rules retain saved rules; `rules: []` clears them; a supplied array replaces the entire rule list atomically. Send only taxRateId/basedOn/priority for each row, excluding returned id/taxClassId/taxRate fields. Rule IDs are regenerated on replacement. Saves use a transaction and lock the class to avoid lost partial updates. Missing rates fail without changing existing data.

Create returns HTTP 201, detail/update HTTP 200: `{id,title,description,createdAt,updatedAt,rules:[{id,taxClassId,taxRateId,basedOn,priority,taxRate:{id,name,rate,type,createdAt,updatedAt}}]}`. Rules are ordered by priority then ID. Same-priority rule ordering has no calculation meaning.

## Tax rate dropdown

There was no existing rate catalog. A small supporting catalog is provided. Create a rate through POST `/api/tax-classes/tax-rates` with `{ "name": "Your configured rate", "rate": 0, "type": "percentage" }`. This example is illustrative, not a recommended tax rate. Name is required/nonblank/unique/max 255. Rate is a required nonnegative JSON number up to 99999999.9999, max four decimals; type percentage/fixed, default percentage. Returned rates are decimal strings. No real tax rates are seeded.

GET `/api/tax-classes/tax-rates` returns `{data:[{id,name,rate,type,createdAt,updatedAt}]}` sorted by name then ID, capped at 10,000; accepts no query parameters. Use `id` as dropdown value and `name` as label. The supporting rate catalog currently exposes create/list only, not an independent Tax Rates management screen.

## List/export/delete

List supports `search` (case-insensitive partial title), `date` (YYYY-MM-DD created day), or inclusive `startDate`/`endDate` range, `page` default 1/max 1000000, `limit` default 10/max 100, `sortBy` title/createdAt (default title), `sortOrder` ASC/DESC (default ASC). Parameterized search treats wildcard characters literally. Dates use stored database timestamps. Response `{data:[{id,title,description,createdAt,updatedAt,no}],meta:{total,page,limit,totalPages}}`. The No. column uses calculated `no`, not a database column. List excludes rule details; use detail for edit.

Export uses the same filters and sorting, format csv (default) or xlsx; exports up to 10,000 matching classes, ignoring pagination. Column: Tax Class Title. Spreadsheet formula prefixes are escaped. View/settings controls are frontend-only.

Bulk deletion accepts `{ids:["class-uuid"]}`, 1–100 unique UUIDs. Every class is locked/validated before deletion; missing IDs return 404 and delete nothing. Response `{message:"Tax classes deleted successfully",deletedCount:1}`. Single deletion returns `{message:"Tax class deleted successfully"}`. Rules cascade with classes; tax rates remain. Referenced rates cannot be physically deleted while rules use them.

Errors: 400 invalid data, 401 missing authentication, 403 permission, 404 missing class, 409 duplicate title/name or referenced deletion, 500 unexpected failure.

These APIs store tax configuration only. Products are not assigned tax classes, and checkout, cart, order totals, refunds, and payment behavior are unchanged. Address matching, jurisdiction, currency for fixed rates, and priority calculation/compounding need a separate checkout integration specification before these settings affect charges.

Checks: `npm run typecheck`, `npm run test:tax-classes`, `npm run build`. Tests use mocked repositories and actual TypeORM SQL generation, without database connections. Live database testing requires manual schema setup.
