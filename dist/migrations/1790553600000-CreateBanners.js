"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBanners1790553600000 = void 0;
class CreateBanners1790553600000 {
    constructor() {
        this.name = "CreateBanners1790553600000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TABLE "banners" (
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
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query('DROP TABLE "banners"');
            // Preserve permission assignments on rollback.
        });
    }
}
exports.CreateBanners1790553600000 = CreateBanners1790553600000;
