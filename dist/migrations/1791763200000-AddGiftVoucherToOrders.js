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
exports.AddGiftVoucherToOrders1791763200000 = void 0;
class AddGiftVoucherToOrders1791763200000 {
    constructor() {
        this.name = "AddGiftVoucherToOrders1791763200000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "giftVoucherCode" character varying(255)`);
            yield queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "giftVoucherAmount" numeric(12,2) NOT NULL DEFAULT '0'`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "giftVoucherAmount"`);
            yield queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "giftVoucherCode"`);
        });
    }
}
exports.AddGiftVoucherToOrders1791763200000 = AddGiftVoucherToOrders1791763200000;
