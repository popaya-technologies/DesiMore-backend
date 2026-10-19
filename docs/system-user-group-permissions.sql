BEGIN;

ALTER TABLE system_user_groups
  ADD COLUMN IF NOT EXISTS "accessPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "modifyPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE system_user_groups
SET
  "accessPermissions" = COALESCE("accessPermissions", ARRAY[]::TEXT[]),
  "modifyPermissions" = COALESCE("modifyPermissions", ARRAY[]::TEXT[]);

COMMIT;
