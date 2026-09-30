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
exports.UpdateRecipeDto = exports.CreateRecipeDto = exports.RecipeImageDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const supplied = (_, value) => value !== undefined;
class RecipeImageDto {
}
exports.RecipeImageDto = RecipeImageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], RecipeImageDto.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], RecipeImageDto.prototype, "sortOrder", void 0);
class CreateRecipeDto {
}
exports.CreateRecipeDto = CreateRecipeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateRecipeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100000),
    __metadata("design:type", String)
], CreateRecipeDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateRecipeDto.prototype, "metaTitle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateRecipeDto.prototype, "metaDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateRecipeDto.prototype, "metaKeywords", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], CreateRecipeDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateRecipeDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    __metadata("design:type", String)
], CreateRecipeDto.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RecipeImageDto),
    __metadata("design:type", Array)
], CreateRecipeDto.prototype, "additionalImages", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateRecipeDto.prototype, "categories", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateRecipeDto.prototype, "relatedProducts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateRecipeDto.prototype, "seoKeyword", void 0);
class UpdateRecipeDto {
}
exports.UpdateRecipeDto = UpdateRecipeDto;
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateRecipeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100000),
    __metadata("design:type", String)
], UpdateRecipeDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateRecipeDto.prototype, "metaTitle", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdateRecipeDto.prototype, "metaDescription", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdateRecipeDto.prototype, "metaKeywords", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], UpdateRecipeDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateRecipeDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    __metadata("design:type", String)
], UpdateRecipeDto.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RecipeImageDto),
    __metadata("design:type", Array)
], UpdateRecipeDto.prototype, "additionalImages", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateRecipeDto.prototype, "categories", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateRecipeDto.prototype, "relatedProducts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateRecipeDto.prototype, "seoKeyword", void 0);
