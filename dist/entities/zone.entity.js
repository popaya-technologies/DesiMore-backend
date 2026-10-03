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
exports.Zone = void 0;
const typeorm_1 = require("typeorm");
const country_entity_1 = require("./country.entity");
let Zone = class Zone {
};
exports.Zone = Zone;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Zone.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "uuid",
    }),
    __metadata("design:type", String)
], Zone.prototype, "countryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => country_entity_1.Country, {
        onDelete: "RESTRICT",
    }),
    (0, typeorm_1.JoinColumn)({
        name: "countryId",
    }),
    __metadata("design:type", country_entity_1.Country)
], Zone.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 255,
    }),
    __metadata("design:type", String)
], Zone.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", String)
], Zone.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: true,
    }),
    __metadata("design:type", Boolean)
], Zone.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Zone.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Zone.prototype, "updatedAt", void 0);
exports.Zone = Zone = __decorate([
    (0, typeorm_1.Entity)("zones")
], Zone);
