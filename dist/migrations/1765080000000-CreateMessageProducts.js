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
exports.CreateMessageProducts1765080000000 = void 0;
class CreateMessageProducts1765080000000 {
    constructor() {
        this.name = "CreateMessageProducts1765080000000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TABLE "message_products" ("messageId" uuid NOT NULL, "productId" uuid NOT NULL, CONSTRAINT "PK_message_products" PRIMARY KEY ("messageId", "productId"))`);
            yield queryRunner.query(`CREATE INDEX "IDX_message_products_messageId" ON "message_products" ("messageId")`);
            yield queryRunner.query(`CREATE INDEX "IDX_message_products_productId" ON "message_products" ("productId")`);
            yield queryRunner.query(`ALTER TABLE "message_products" ADD CONSTRAINT "FK_message_products_messageId" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
            yield queryRunner.query(`ALTER TABLE "message_products" ADD CONSTRAINT "FK_message_products_productId" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "message_products" DROP CONSTRAINT "FK_message_products_productId"`);
            yield queryRunner.query(`ALTER TABLE "message_products" DROP CONSTRAINT "FK_message_products_messageId"`);
            yield queryRunner.query(`DROP INDEX "IDX_message_products_productId"`);
            yield queryRunner.query(`DROP INDEX "IDX_message_products_messageId"`);
            yield queryRunner.query(`DROP TABLE "message_products"`);
        });
    }
}
exports.CreateMessageProducts1765080000000 = CreateMessageProducts1765080000000;
