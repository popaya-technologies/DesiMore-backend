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
exports.CancelledOrderArchive = exports.OrderHistory = void 0;
const typeorm_1 = require("typeorm");
const order_entity_1 = require("./order.entity");
let OrderHistory = class OrderHistory {
};
exports.OrderHistory = OrderHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], OrderHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)("uuid"),
    __metadata("design:type", String)
], OrderHistory.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "orderId" }),
    __metadata("design:type", order_entity_1.Order)
], OrderHistory.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50 }),
    __metadata("design:type", String)
], OrderHistory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", default: "" }),
    __metadata("design:type", String)
], OrderHistory.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], OrderHistory.prototype, "carrierName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], OrderHistory.prototype, "trackingNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], OrderHistory.prototype, "customerNotified", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], OrderHistory.prototype, "override", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], OrderHistory.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OrderHistory.prototype, "createdAt", void 0);
exports.OrderHistory = OrderHistory = __decorate([
    (0, typeorm_1.Entity)("order_history"),
    (0, typeorm_1.Index)("IDX_order_history_order", ["orderId", "createdAt"])
], OrderHistory);
// Archival is scoped to the cancelled-orders admin page. Accounting records stay intact.
let CancelledOrderArchive = class CancelledOrderArchive {
};
exports.CancelledOrderArchive = CancelledOrderArchive;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], CancelledOrderArchive.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", unique: true }),
    __metadata("design:type", String)
], CancelledOrderArchive.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, { onDelete: "RESTRICT" }),
    (0, typeorm_1.JoinColumn)({ name: "orderId" }),
    __metadata("design:type", order_entity_1.Order)
], CancelledOrderArchive.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], CancelledOrderArchive.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CancelledOrderArchive.prototype, "createdAt", void 0);
exports.CancelledOrderArchive = CancelledOrderArchive = __decorate([
    (0, typeorm_1.Entity)("cancelled_order_archives")
], CancelledOrderArchive);
