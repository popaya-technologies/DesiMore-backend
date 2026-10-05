# Tax Rates admin API

Run `docs/tax-rate-schema.sql` manually in pgAdmin before restarting/using the new backend. It preserves the existing tax_rates table, adds nullable geoZoneId and the customer-group join table, and registers permissions. Existing geo_zones, customer_groups and permissions tables are prerequisites. No SQL was executed by this implementation. Assign permissions through existing RBAC; accessToken cookie authentication and superadmin bypass apply.

| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | `/api/tax-rates` | tax-rate:read |
| GET | `/api/tax-rates/options` | tax-rate:read |
| GET | `/api/tax-rates/export?format=csv` | tax-rate:read |
| GET | `/api/tax-rates/:id` | tax-rate:read |
| POST | `/api/tax-rates` | tax-rate:create |
| PUT / PATCH | `/api/tax-rates/:id` | tax-rate:update |
| DELETE | `/api/tax-rates/:id` | tax-rate:delete |
| DELETE | `/api/tax-rates/bulk` | tax-rate:delete |

Create example (use real IDs from options; rate shown only as an API example):

```json
{
  "name": "Configured Tax",
  "rate": 5,
  "type": "percentage",
  "customerGroupIds": [],
  "geoZoneId": null
}
```

Required create fields: name and rate. Name is trimmed, nonblank, max 255, case-sensitive unique. Rate is a JSON number, nonnegative, max 99999999.9999, up to four decimal places; responses use exact four-place decimal strings. Type: percentage/fixed, defaults to percentage. Geo zone is optional, nullable UUID; null clears it. CustomerGroupIds is optional, up to 100 distinct existing group UUIDs; [] clears selections. Empty groups/null zone represent unassigned configuration, not an automatic global tax policy. No rates or groups are seeded.

PUT/PATCH allow nonempty partial updates: omitted fields and groups are retained. Supplied group IDs replace all selections. Saves validate references and write in a transaction while locking existing rates. Unknown fields, invalid numbers, null name/rate/type/groups, duplicate groups or invalid references return 400. Missing rate returns 404; duplicate name returns 409.

Create returns 201; detail/update 200: `{id,name,rate,type,geoZoneId,geoZone:{id,name}|null,customerGroupIds:[],customerGroups:[{id,name}],createdAt,updatedAt}`. Options returns `{geoZones:[{id,name}],customerGroups:[{id,name}],types:["percentage","fixed"]}`. No query parameters; each option catalog is capped at 10,000 rows.

List query: search (case-insensitive partial name), date (YYYY-MM-DD created day) or inclusive startDate/endDate, page default 1/max 1000000, limit default 10/max 100, sortBy name/rate/type/createdAt/updatedAt (default name), sortOrder ASC/DESC (default ASC). Response `{data:[{...detailFields,no}],meta:{total,page,limit,totalPages}}`. No. is the calculated page row number. Dates follow stored database timestamps; search is parameterized and wildcards escaped.

Export supports the same filters/sorting plus format csv (default) or xlsx; exports matching rates independent of pagination, max 10,000. Columns: Tax Name, Tax Rate, Type, Geo Zone, Date Added, Date Modified. Names are escaped against spreadsheet formulas.

Bulk delete body `{ids:["rate-uuid"]}`: 1–100 unique UUIDs, all-or-nothing transaction. Missing IDs return 404, invalid IDs 400. References from tax_class_rules block single and bulk deletion with 409; nothing is removed from a failed batch. Customer-group links cascade when a rate is removed. Existing groups/zones are never deleted. Deletion of linked groups/zones is blocked by the manual SQL's foreign keys. Keep TypeORM synchronize disabled as configured.

The legacy `/api/tax-classes/tax-rates` create/list routes remain compatible with their original fields and tax-class permissions; old creation defaults to no geo zone/groups. Use the new `/api/tax-rates` endpoints for the full form. Existing rate IDs and tax-class rules remain intact; editing a rate updates the shared catalog used by those rules.

This manages configuration only. Checkout calculations, payments, customer group assignment and jurisdiction matching are unchanged. Fixed-rate currency and runtime applicability are not defined by these admin screens.

Checks: `npm run typecheck`, `npm run test:tax-rates`, `npm run test:tax-classes`, `npm run build`. Tests use repository mocks and TypeORM metadata/SQL generation, no live database connection. Live integration awaits manual SQL setup.
