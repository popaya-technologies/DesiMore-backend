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
exports.CustomerApproval = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const customer_group_entity_1 = require("./customer-group.entity");
let CustomerApproval = class CustomerApproval {
};
exports.CustomerApproval = CustomerApproval;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], CustomerApproval.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", unique: true }),
    __metadata("design:type", String)
], CustomerApproval.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, {
        onDelete: "RESTRICT",
    }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", user_entity_1.User)
], CustomerApproval.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], CustomerApproval.prototype, "customerGroupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_group_entity_1.CustomerGroup, {
        onDelete: "RESTRICT",
    }),
    (0, typeorm_1.JoinColumn)({ name: "customerGroupId" }),
    __metadata("design:type", customer_group_entity_1.CustomerGroup)
], CustomerApproval.prototype, "customerGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20 }),
    __metadata("design:type", String)
], CustomerApproval.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 20,
        default: "pending",
    }),
    __metadata("design:type", String)
], CustomerApproval.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], CustomerApproval.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "uuid",
        nullable: true,
    }),
    __metadata("design:type", String)
], CustomerApproval.prototype, "reviewedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "timestamp",
        nullable: true,
    }),
    __metadata("design:type", Date)
], CustomerApproval.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomerApproval.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustomerApproval.prototype, "updatedAt", void 0);
exports.CustomerApproval = CustomerApproval = __decorate([
    (0, typeorm_1.Entity)("customer_approvals"),
    (0, typeorm_1.Index)("IDX_customer_approvals_status_created", ["status", "createdAt"])
], CustomerApproval);
