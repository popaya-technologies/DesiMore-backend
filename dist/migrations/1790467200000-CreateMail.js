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
exports.CreateMail1790467200000 = void 0;
class CreateMail1790467200000 {
    constructor() {
        this.name = "CreateMail1790467200000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TABLE "newsletter_subscribers" (
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
ON CONFLICT ("name") DO NOTHING;`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query('DROP TABLE "mail_requests"; DROP TABLE "newsletter_subscribers";');
            // Retain existing permission assignments on rollback.
        });
    }
}
exports.CreateMail1790467200000 = CreateMail1790467200000;
