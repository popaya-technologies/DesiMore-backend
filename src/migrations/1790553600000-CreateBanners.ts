import { MigrationInterface, QueryRunner } from "typeorm";
export class CreateBanners1790553600000 implements MigrationInterface {
  name = "CreateBanners1790553600000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "banners" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" varchar(255) NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "slides" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
INSERT INTO "permissions" ("id", "name", "description", "resource", "action", "createdAt", "updatedAt")
SELECT uuid_generate_v4(), 'banner:' || action, 'Manage banners: ' || action, 'banner', action, now(), now()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" p WHERE p."resource" = 'banner' AND p."action" = actions.action
)
ON CONFLICT ("name") DO NOTHING;`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "banners"');
    // Preserve permission assignments on rollback.
  }
}
