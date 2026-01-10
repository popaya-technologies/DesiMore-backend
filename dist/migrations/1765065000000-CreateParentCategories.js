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
exports.CreateParentCategories1765065000000 = void 0;
class CreateParentCategories1765065000000 {
    constructor() {
        this.name = "CreateParentCategories1765065000000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TABLE "parent_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "image" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9a6e67779aed32d00ebc9ef32c8" UNIQUE ("name"), CONSTRAINT "PK_6e138c1964368f8bd04f1938743" PRIMARY KEY ("id"))`);
            yield queryRunner.query(`ALTER TABLE "categories" ADD "parentCategoryId" uuid`);
            yield queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_8cc2cb7f6c5da6c2fd2856dddfb" FOREIGN KEY ("parentCategoryId") REFERENCES "parent_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_8cc2cb7f6c5da6c2fd2856dddfb"`);
            yield queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "parentCategoryId"`);
            yield queryRunner.query(`DROP TABLE "parent_categories"`);
        });
    }
}
exports.CreateParentCategories1765065000000 = CreateParentCategories1765065000000;
