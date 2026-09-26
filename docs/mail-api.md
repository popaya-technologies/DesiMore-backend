# Mail form API

Restores the same Mail API: Default sender, All Newsletter Subscribers, Subject and rich-text Message.
Uses the existing SendGrid/SMTP utility without changing other email or shopping flows.

## Database

Apply [mail-schema.sql](mail-schema.sql) once OR run `npm run migration:run`.
The SQL assumes the existing permissions/migrations tables and uuid_generate_v4() function.
It records the migration to prevent TypeORM applying it again.
If the previous Mail schema is still installed, no database changes are needed.
No application database has been modified by this restoration.

Tables: newsletter_subscribers (unique normalized email, isActive, timestamps);
mail_requests (requestId, createdBy, payloadHash, subject, status, total, accepted, uncertain, timestamps).
Permission: mail:send. Assign it through existing RBAC for staff; super-admin already bypasses checks.

## Endpoints

All endpoints require the accessToken cookie and mail:send permission.

| Method | Path | Purpose |
|---|---|---|
| GET | /api/mail/form-options | Sender/audience options and active subscriber count |
| POST | /api/mail/send | Send and return recorded outcome |
| GET | /api/mail/requests/:requestId | Read the initiating user's request status |

Send JSON:
```json
{
 "requestId": "11111111-1111-4111-8111-111111111111",
 "from": "default",
 "to": "newsletter_subscribers",
 "subject": "Latest offers",
 "message": "<p>Explore our <strong>latest offers</strong>.</p>"
}
```

Generate requestId once with crypto.randomUUID() for each intentional mailing.
Keep it for duplicate clicks, retries and status lookup. A new ID starts a new mailing.
Reusing an ID with different content returns 409; a concurrent duplicate can also return 409.
Disable Send while submitting. After a timeout, poll status with the same requestId.

Only the shown sender and audience are supported. Arbitrary sender addresses are rejected.
The sender uses existing FROM_EMAIL or SMTP_USER configuration.
Subject is nonblank, at most 255 characters, and cannot contain newlines.
Message is at most 100,000 characters, sanitized HTML, and must contain text.
Unknown keys are rejected. Inactive subscribers are excluded, with a recheck before each send.
Recipients receive separate messages so their addresses are not shared.

HTTP 200 returns id, requestId, createdBy, payloadHash, subject, status, total,
accepted, uncertain, createdAt and updatedAt.
- completed: all attempted provider calls succeeded.
- needs_review: provider calls errored; acceptance may be uncertain.
- processing: work started but is not recorded complete, including interrupted server processes.
accepted means provider acceptance, not confirmed inbox delivery.
Do not automatically resend uncertain or interrupted requests; inspect provider records first.
Duplicate requests return their existing record without sending again.

Same limit as before: synchronous sending, at most 500 active subscriber rows.
Larger audiences and empty audiences return 400 before sending.
There is no background worker, automatic retry, or delivery webhook.

## Subscriber source

The table starts empty; registered customers are not automatically newsletter subscribers.
Import actual opted-in addresses from your subscription source. No public signup API is added.

Parameterized import:
```sql
INSERT INTO newsletter_subscribers (email, "isActive")
VALUES (lower(btrim($1)), true)
ON CONFLICT (email) DO UPDATE
SET "isActive" = true, "updatedAt" = now();
```

Unsubscribe:
```sql
UPDATE newsletter_subscribers
SET "isActive" = false, "updatedAt" = now()
WHERE email = lower(btrim($1));
```

## Tests

```powershell
npm run typecheck
$env:MAIL_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55439/desimore_mail_test'
npm run test:mail
npm run build
```

Tests clear only the explicitly configured isolated desimore_mail_test database.
Email delivery is mocked: no real messages are sent.
