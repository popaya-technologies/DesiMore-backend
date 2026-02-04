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
exports.WholesaleOrderRequest = exports.WholesaleOrderRequestStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const wholesale_order_item_entity_1 = require("./wholesale-order-item.entity");
var WholesaleOrderRequestStatus;
(function (WholesaleOrderRequestStatus) {
    WholesaleOrderRequestStatus["PENDING"] = "pending";
    WholesaleOrderRequestStatus["APPROVED"] = "approved";
    WholesaleOrderRequestStatus["REJECTED"] = "rejected";
    WholesaleOrderRequestStatus["DELIVERED"] = "delivered";
})(WholesaleOrderRequestStatus || (exports.WholesaleOrderRequestStatus = WholesaleOrderRequestStatus = {}));
let WholesaleOrderRequest = class WholesaleOrderRequest {
};
exports.WholesaleOrderRequest = WholesaleOrderRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], WholesaleOrderRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.wholesaleOrderRequests, {
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", user_entity_1.User)
], WholesaleOrderRequest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], WholesaleOrderRequest.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", unique: true }),
    __metadata("design:type", String)
], WholesaleOrderRequest.prototype, "requestNumber", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => wholesale_order_item_entity_1.WholesaleOrderItem, (item) => item.request, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], WholesaleOrderRequest.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], WholesaleOrderRequest.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], WholesaleOrderRequest.prototype, "tax", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], WholesaleOrderRequest.prototype, "shipping", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], WholesaleOrderRequest.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], WholesaleOrderRequest.prototype, "total", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 50,
        default: WholesaleOrderRequestStatus.PENDING,
    }),
    __metadata("design:type", String)
], WholesaleOrderRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb" }),
    __metadata("design:type", Object)
], WholesaleOrderRequest.prototype, "shippingAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], WholesaleOrderRequest.prototype, "billingAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], WholesaleOrderRequest.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], WholesaleOrderRequest.prototype, "adminNotes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WholesaleOrderRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WholesaleOrderRequest.prototype, "updatedAt", void 0);
exports.WholesaleOrderRequest = WholesaleOrderRequest = __decorate([
    (0, typeorm_1.Entity)("wholesale_order_requests")
], WholesaleOrderRequest);
