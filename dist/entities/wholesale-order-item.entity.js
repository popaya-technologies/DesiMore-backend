"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WholesaleOrderItem = void 0;
const typeorm_1 = require("typeorm");
const wholesale_order_request_entity_1 = require("./wholesale-order-request.entity");
let WholesaleOrderItem = class WholesaleOrderItem {
    calculateTotals() {
        var _a;
        const unitsPerCarton = (_a = this.unitsPerCarton) !== null && _a !== void 0 ? _a : 0;
        this.totalUnits = unitsPerCarton
            ? unitsPerCarton * this.requestedBoxes
            : null;
        this.total = Number((this.effectivePricePerCarton * this.requestedBoxes).toFixed(2));
    }
};
exports.WholesaleOrderItem = WholesaleOrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], WholesaleOrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => wholesale_order_request_entity_1.WholesaleOrderRequest, (request) => request.items, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "requestId" }),
    __metadata("design:type", wholesale_order_request_entity_1.WholesaleOrderRequest)
], WholesaleOrderItem.prototype, "request", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], WholesaleOrderItem.prototype, "requestId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], WholesaleOrderItem.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], WholesaleOrderItem.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { array: true, default: [] }),
    __metadata("design:type", Array)
], WholesaleOrderItem.prototype, "productImages", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer" }),
    __metadata("design:type", Number)
], WholesaleOrderItem.prototype, "requestedBoxes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", String)
], WholesaleOrderItem.prototype, "wholesaleOrderQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", nullable: true }),
    __metadata("design:type", Number)
], WholesaleOrderItem.prototype, "unitsPerCarton", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], WholesaleOrderItem.prototype, "wholesalePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], WholesaleOrderItem.prototype, "effectivePricePerCarton", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", nullable: true }),
    __metadata("design:type", Number)
], WholesaleOrderItem.prototype, "totalUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], WholesaleOrderItem.prototype, "total", void 0);
exports.WholesaleOrderItem = WholesaleOrderItem = __decorate([
    (0, typeorm_1.Entity)("wholesale_order_items")
], WholesaleOrderItem);
