-- Clear a transaction left aborted by an earlier failed attempt.
ROLLBACK;
BEGIN;

ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS "userGroupId" UUID;

-- Migrate the legacy name column only when it still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'system_users'
      AND column_name = 'userGroup'
  ) THEN
    EXECUTE $migration$
      INSERT INTO system_user_groups (id, name, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), source.name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM (
        SELECT DISTINCT TRIM("userGroup") AS name
        FROM system_users
        WHERE "userGroup" IS NOT NULL
          AND LENGTH(TRIM("userGroup")) > 0
      ) AS source
      WHERE NOT EXISTS (
        SELECT 1
        FROM system_user_groups existing
        WHERE LOWER(existing.name) = LOWER(source.name)
      )
    $migration$;

    EXECUTE $migration$
      UPDATE system_users AS su
      SET "userGroupId" = user_group.id
      FROM system_user_groups AS user_group
      WHERE su."userGroupId" IS NULL
        AND LOWER(TRIM(su."userGroup")) = LOWER(TRIM(user_group.name))
    $migration$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM system_users
    WHERE "userGroupId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Some system users could not be matched to a user group.';
  END IF;
END $$;

ALTER TABLE system_users
  ALTER COLUMN "userGroupId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FK_system_users_user_group'
  ) THEN
    ALTER TABLE system_users
      ADD CONSTRAINT "FK_system_users_user_group"
      FOREIGN KEY ("userGroupId")
      REFERENCES system_user_groups(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_system_users_user_group_id"
  ON system_users ("userGroupId");

ALTER TABLE system_users
  DROP COLUMN IF EXISTS "userGroup";

COMMIT;
