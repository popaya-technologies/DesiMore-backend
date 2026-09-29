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
exports.UpdateOptionDto = exports.CreateOptionDto = exports.CatalogOptionValueDto = exports.CATALOG_OPTION_TYPES = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
exports.CATALOG_OPTION_TYPES = ["select", "radio", "checkbox", "text", "textarea", "date", "time", "datetime"];
const supplied = (_, value) => value !== undefined;
class CatalogOptionValueDto {
}
exports.CatalogOptionValueDto = CatalogOptionValueDto;
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CatalogOptionValueDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CatalogOptionValueDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_, value) => value !== undefined && value !== null),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], CatalogOptionValueDto.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], CatalogOptionValueDto.prototype, "sortOrder", void 0);
class CreateOptionDto {
}
exports.CreateOptionDto = CreateOptionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateOptionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsIn)(exports.CATALOG_OPTION_TYPES),
    __metadata("design:type", String)
], CreateOptionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], CreateOptionDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CatalogOptionValueDto),
    __metadata("design:type", Array)
], CreateOptionDto.prototype, "values", void 0);
class UpdateOptionDto {
}
exports.UpdateOptionDto = UpdateOptionDto;
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateOptionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsIn)(exports.CATALOG_OPTION_TYPES),
    __metadata("design:type", String)
], UpdateOptionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], UpdateOptionDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CatalogOptionValueDto),
    __metadata("design:type", Array)
], UpdateOptionDto.prototype, "values", void 0);
