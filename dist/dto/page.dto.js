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
exports.UpdatePageDto = void 0;
const class_validator_1 = require("class-validator");
const page_entity_1 = require("../entities/page.entity");
const supplied = (_, value) => value !== undefined;
class UpdatePageDto {
}
exports.UpdatePageDto = UpdatePageDto;
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdatePageDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000000),
    __metadata("design:type", String)
], UpdatePageDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MaxLength)(2048, { each: true }),
    __metadata("design:type", Array)
], UpdatePageDto.prototype, "media", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdatePageDto.prototype, "metaTagTitle", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdatePageDto.prototype, "metaTagDescription", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdatePageDto.prototype, "metaTagKeywords", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsIn)(page_entity_1.PAGE_PLACEMENTS),
    __metadata("design:type", String)
], UpdatePageDto.prototype, "bottom", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], UpdatePageDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePageDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_validator_1.Matches)(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    __metadata("design:type", String)
], UpdatePageDto.prototype, "slug", void 0);
