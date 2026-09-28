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
exports.Attribute = void 0;
const typeorm_1 = require("typeorm");
const attribute_group_entity_1 = require("./attribute-group.entity");
let Attribute = class Attribute {
};
exports.Attribute = Attribute;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Attribute.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Attribute.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", default: attribute_group_entity_1.DEFAULT_ATTRIBUTE_GROUP_ID }),
    __metadata("design:type", String)
], Attribute.prototype, "attributeGroupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => attribute_group_entity_1.AttributeGroup, { nullable: false, onDelete: "RESTRICT" }),
    (0, typeorm_1.JoinColumn)({ name: "attributeGroupId" }),
    __metadata("design:type", attribute_group_entity_1.AttributeGroup)
], Attribute.prototype, "attributeGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 0 }),
    __metadata("design:type", Number)
], Attribute.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Attribute.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Attribute.prototype, "updatedAt", void 0);
exports.Attribute = Attribute = __decorate([
    (0, typeorm_1.Entity)("attributes"),
    (0, typeorm_1.Unique)("UQ_attribute_group_name", ["attributeGroupId", "name"])
], Attribute);
