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
exports.RecipeCategory = void 0;
const typeorm_1 = require("typeorm");
let RecipeCategory = class RecipeCategory {
};
exports.RecipeCategory = RecipeCategory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], RecipeCategory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 255,
        unique: true,
    }),
    __metadata("design:type", String)
], RecipeCategory.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], RecipeCategory.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 255,
    }),
    __metadata("design:type", String)
], RecipeCategory.prototype, "metaTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], RecipeCategory.prototype, "metaDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], RecipeCategory.prototype, "metaKeywords", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "uuid",
        nullable: true,
    }),
    __metadata("design:type", String)
], RecipeCategory.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        nullable: true,
    }),
    __metadata("design:type", String)
], RecipeCategory.prototype, "image", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: false,
    }),
    __metadata("design:type", Boolean)
], RecipeCategory.prototype, "top", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "integer",
        default: 1,
    }),
    __metadata("design:type", Number)
], RecipeCategory.prototype, "columns", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "integer",
        default: 0,
    }),
    __metadata("design:type", Number)
], RecipeCategory.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: true,
    }),
    __metadata("design:type", Boolean)
], RecipeCategory.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 255,
        unique: true,
        nullable: true,
    }),
    __metadata("design:type", String)
], RecipeCategory.prototype, "seoKeyword", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RecipeCategory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RecipeCategory.prototype, "updatedAt", void 0);
exports.RecipeCategory = RecipeCategory = __decorate([
    (0, typeorm_1.Entity)("recipe_categories")
], RecipeCategory);
