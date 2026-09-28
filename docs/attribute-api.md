# Attributes API

Implements the supplied admin Attributes list and Add Attribute form.
Run [attribute-schema.sql](attribute-schema.sql) ONCE in pgAdmin against your existing application database.
The script creates attribute_groups, attributes, the default Product group, and permissions.
No automatic migration is added and no database changes are executed.
Existing product_attributes, product requests and product responses remain unchanged.
These are standalone catalog definitions; linking them to products is a separate integration.

## Endpoints

Use the existing accessToken cookie. Super-admin (su) bypasses permission checks.
Assign attribute permissions to other staff using the existing RBAC system.

| Method | Endpoint | Permission |
|---|---|---|
| POST | /api/attributes | attribute:create |
| GET | /api/attributes | attribute:read |
| GET | /api/attributes/:id | attribute:read |
| PATCH or PUT | /api/attributes/:id | attribute:update |
| DELETE | /api/attributes/:id | attribute:delete |
| GET | /api/attributes/form-options | Any of attribute:read/create/update |
| GET | /api/attributes/export?format=csv | attribute:read |
| GET | /api/attributes/export?format=xlsx | attribute:read |

## Form payload

```json
{
  "name": "Material",
  "attributeGroupId": "b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc",
  "sortOrder": 0
}
```

- name: required on create, nonblank string, maximum 255 characters; trimmed.
- attributeGroupId: optional on create, defaults to the Product group seeded by SQL.
  When supplied it must be an existing group's UUID; do not send the group name.
- sortOrder: optional, defaults to 0; integer 0–2147483647. Send a JSON number.
- Nulls, unknown keys, invalid types and malformed UUIDs return 400.
- Duplicate names in the same group return 409 (case-sensitive). Names may repeat in different groups.
- PUT and PATCH update only supplied fields. Empty updates return 400.
- Missing attributes return 404. Delete removes only the master definition, not product attribute values.

Create returns HTTP 201. Detail/update return HTTP 200:
```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "name": "Material",
  "attributeGroupId": "b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc",
  "sortOrder": 0,
  "attributeGroup": {
    "id": "b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc",
    "name": "Product",
    "sortOrder": 0
  }
}
```
Responses also include createdAt/updatedAt timestamps on the attribute and group.
Display attributeGroup.name in the Attribute Group table column.

GET /api/attributes/form-options returns:
```json
{
  "attributeGroups": [
    { "id": "b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc", "name": "Product", "sortOrder": 0 }
  ],
  "defaults": {
    "attributeGroupId": "b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc",
    "sortOrder": 0
  }
}
```
Group objects also include timestamps. Options are sorted by sortOrder, then name.
Only Product is initially seeded because that is the group shown in the screenshot.
Additional groups can be inserted manually and will appear automatically:
```sql
INSERT INTO attribute_groups (name, "sortOrder") VALUES ('Technical', 1);
```
No group administration screens or APIs are added in this scope.

## List/filter/export

GET /api/attributes?search=material&page=1&limit=10&sortBy=sortOrder&sortOrder=ASC

| Parameter | Meaning |
|---|---|
| search | Case-insensitive literal substring of attribute name or group name, up to 255 characters |
| attributeGroupId | Exact group UUID filter |
| date | Creation date YYYY-MM-DD |
| startDate, endDate | Inclusive creation date range; do not combine with date |
| page | Positive integer, defaults to 1 |
| limit | 1–100, defaults to 10 |
| sortBy | name, attributeGroup, sortOrder, createdAt; defaults to sortOrder |
| sortOrder | ASC or DESC; defaults to ASC |

Sort order ties use the attribute ID for stable pagination. Date filters use stored timestamp calendar days.
Response: { data: [...], meta: { total, page, limit, totalPages } }.

Export uses the same filters and sort, ignoring pagination for row selection.
CSV and XLSX contain Attribute Name, Attribute Group, Sort Order.
Limit is 10,000 matching attributes; larger results return 400 asking for narrower filters.
Spreadsheet formulas in names are escaped without modifying stored data.
View/column settings and row-selection state belong to the frontend.

## Tests

Run npm run typecheck, npm run test:attributes and npm run build.
Tests use repository doubles and actual TypeORM metadata/query generation. No database connections,
tables or rows are created. Real database integration requires applying the SQL first.
