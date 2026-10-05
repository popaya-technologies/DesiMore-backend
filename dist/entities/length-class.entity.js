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
exports.LengthClass = void 0;
const typeorm_1 = require("typeorm");
let LengthClass = class LengthClass {
};
exports.LengthClass = LengthClass;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], LengthClass.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, unique: true }),
    __metadata("design:type", String)
], LengthClass.prototype, "lengthTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 32, unique: true }),
    __metadata("design:type", String)
], LengthClass.prototype, "lengthUnit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "numeric", precision: 20, scale: 8, default: 1,
        transformer: { to: (value) => value, from: (value) => Number(value) } }),
    __metadata("design:type", Number)
], LengthClass.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], LengthClass.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], LengthClass.prototype, "updatedAt", void 0);
exports.LengthClass = LengthClass = __decorate([
    (0, typeorm_1.Entity)("length_classes")
], LengthClass);
