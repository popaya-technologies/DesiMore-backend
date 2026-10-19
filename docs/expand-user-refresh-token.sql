-- JWT refresh tokens can exceed VARCHAR(255), especially when more claims are added.
-- This statement preserves all existing values while removing the length limit.
ALTER TABLE "users"
  ALTER COLUMN "refreshToken" TYPE TEXT;
