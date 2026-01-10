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
exports.AddCartTypeAndMultipleCarts1765070000000 = void 0;
const typeorm_1 = require("typeorm");
class AddCartTypeAndMultipleCarts1765070000000 {
    constructor() {
        this.name = "AddCartTypeAndMultipleCarts1765070000000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            const table = yield queryRunner.getTable("carts");
            const userUnique = table === null || table === void 0 ? void 0 : table.uniques.find((unique) => unique.columnNames.length === 1 && unique.columnNames[0] === "userId");
            if (userUnique) {
                yield queryRunner.dropUniqueConstraint("carts", userUnique);
            }
            yield queryRunner.addColumn("carts", new typeorm_1.TableColumn({
                name: "type",
                type: "varchar",
                length: "20",
                isNullable: false,
                default: `'regular'`,
            }));
            yield queryRunner.createIndex("carts", new typeorm_1.TableIndex({
                name: "IDX_carts_userId_type",
                columnNames: ["userId", "type"],
                isUnique: true,
            }));
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.dropIndex("carts", "IDX_carts_userId_type");
            yield queryRunner.dropColumn("carts", "type");
            yield queryRunner.createUniqueConstraint("carts", new typeorm_1.TableUnique({
                name: "UQ_carts_userId",
                columnNames: ["userId"],
            }));
        });
    }
}
exports.AddCartTypeAndMultipleCarts1765070000000 = AddCartTypeAndMultipleCarts1765070000000;
