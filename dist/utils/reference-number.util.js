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
exports.generateWholesaleRequestNumber = exports.generateOrderNumber = void 0;
const data_source_1 = require("../data-source");
const order_entity_1 = require("../entities/order.entity");
const wholesale_order_request_entity_1 = require("../entities/wholesale-order-request.entity");
const ORDER_PREFIX = "INV";
const WHOLESALE_PREFIX = "WS";
const PAD_WIDTH = 6;
const padNumber = (value) => value.toString().padStart(PAD_WIDTH, "0");
const extractSequence = (reference) => {
    if (!reference)
        return null;
    const parts = reference.split("-");
    if (parts.length < 3)
        return null;
    const parsed = parseInt(parts[2], 10);
    return isNaN(parsed) ? null : parsed;
};
const getLatestSequence = (prefix, year, entity, column) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const repo = data_source_1.AppDataSource.getRepository(entity);
    const prefixWithYear = `${prefix}-${year}-`;
    const latest = yield repo
        .createQueryBuilder("record")
        .select(`record.${column}`, "ref")
        .where(`record.${column} LIKE :prefix`, { prefix: `${prefixWithYear}%` })
        .orderBy(`record.${column}`, "DESC")
        .limit(1)
        .getRawOne();
    return (_a = extractSequence(latest === null || latest === void 0 ? void 0 : latest.ref)) !== null && _a !== void 0 ? _a : 0;
});
const buildReference = (prefix, year, sequence) => `${prefix}-${year}-${padNumber(sequence)}`;
const generateOrderNumber = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentYear = new Date().getFullYear();
    const lastSeq = yield getLatestSequence(ORDER_PREFIX, currentYear, order_entity_1.Order, "orderNumber");
    return buildReference(ORDER_PREFIX, currentYear, lastSeq + 1);
});
exports.generateOrderNumber = generateOrderNumber;
const generateWholesaleRequestNumber = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentYear = new Date().getFullYear();
    const lastSeq = yield getLatestSequence(WHOLESALE_PREFIX, currentYear, wholesale_order_request_entity_1.WholesaleOrderRequest, "requestNumber");
    return buildReference(WHOLESALE_PREFIX, currentYear, lastSeq + 1);
});
exports.generateWholesaleRequestNumber = generateWholesaleRequestNumber;
