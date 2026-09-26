-- Apply once to the existing application database, OR use migration:run.
-- If you already applied the previous Mail SQL, do not run this again.
BEGIN;
CREATE TABLE "newsletter_subscribers" (
 "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 "email" varchar(254) NOT NULL UNIQUE,
 "isActive" boolean NOT NULL DEFAULT true,
 "createdAt" timestamp NOT NULL DEFAULT now(),
 "updatedAt" timestamp NOT NULL DEFAULT now(),
 CONSTRAINT "newsletter_email_normalized" CHECK ("email" = lower(btrim("email")))
);
CREATE TABLE "mail_requests" (
 "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 "requestId" uuid NOT NULL UNIQUE,
 "createdBy" uuid NOT NULL,
 "payloadHash" varchar(64) NOT NULL,
 "subject" varchar(255) NOT NULL,
 "status" varchar(30) NOT NULL DEFAULT 'processing',
 "total" integer NOT NULL DEFAULT 0,
 "accepted" integer NOT NULL DEFAULT 0,
 "uncertain" integer NOT NULL DEFAULT 0,
 "createdAt" timestamp NOT NULL DEFAULT now(),
 "updatedAt" timestamp NOT NULL DEFAULT now()
);
INSERT INTO "permissions" ("id", "name", "description", "resource", "action", "createdAt", "updatedAt")
SELECT uuid_generate_v4(), 'mail:send', 'Send newsletter mail', 'mail', 'send', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "resource" = 'mail' AND "action" = 'send')
ON CONFLICT ("name") DO NOTHING;
INSERT INTO "migrations" ("timestamp", "name")
SELECT 1790467200000, 'CreateMail1790467200000'
WHERE NOT EXISTS (SELECT 1 FROM "migrations" WHERE "name" = 'CreateMail1790467200000');
COMMIT;
