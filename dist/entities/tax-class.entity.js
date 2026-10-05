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
exports.TaxClassRule = exports.TaxClass = exports.TaxRate = void 0;
const typeorm_1 = require("typeorm");
let TaxRate = class TaxRate {
};
exports.TaxRate = TaxRate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TaxRate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, unique: true }),
    __metadata("design:type", String)
], TaxRate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 12, scale: 4 }),
    __metadata("design:type", String)
], TaxRate.prototype, "rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, default: "percentage" }),
    __metadata("design:type", String)
], TaxRate.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxRate.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TaxRate.prototype, "updatedAt", void 0);
exports.TaxRate = TaxRate = __decorate([
    (0, typeorm_1.Entity)("tax_rates")
], TaxRate);
let TaxClass = class TaxClass {
};
exports.TaxClass = TaxClass;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TaxClass.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, unique: true }),
    __metadata("design:type", String)
], TaxClass.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], TaxClass.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TaxClassRule, rule => rule.taxClass),
    __metadata("design:type", Array)
], TaxClass.prototype, "rules", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxClass.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TaxClass.prototype, "updatedAt", void 0);
exports.TaxClass = TaxClass = __decorate([
    (0, typeorm_1.Entity)("tax_classes")
], TaxClass);
let TaxClassRule = class TaxClassRule {
};
exports.TaxClassRule = TaxClassRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TaxClassRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)("uuid"),
    __metadata("design:type", String)
], TaxClassRule.prototype, "taxClassId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TaxClass, taxClass => taxClass.rules, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "taxClassId" }),
    __metadata("design:type", TaxClass)
], TaxClassRule.prototype, "taxClass", void 0);
__decorate([
    (0, typeorm_1.Column)("uuid"),
    __metadata("design:type", String)
], TaxClassRule.prototype, "taxRateId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TaxRate, { onDelete: "RESTRICT" }),
    (0, typeorm_1.JoinColumn)({ name: "taxRateId" }),
    __metadata("design:type", TaxRate)
], TaxClassRule.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, default: "shipping" }),
    __metadata("design:type", String)
], TaxClassRule.prototype, "basedOn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 1 }),
    __metadata("design:type", Number)
], TaxClassRule.prototype, "priority", void 0);
exports.TaxClassRule = TaxClassRule = __decorate([
    (0, typeorm_1.Entity)("tax_class_rules"),
    (0, typeorm_1.Index)("IDX_tax_class_rules_class", ["taxClassId"]),
    (0, typeorm_1.Index)("UQ_tax_class_rule_rate_basis", ["taxClassId", "taxRateId", "basedOn"], { unique: true })
], TaxClassRule);
