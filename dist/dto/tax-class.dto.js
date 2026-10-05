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
exports.CreateTaxRateDto = exports.BulkDeleteTaxClassDto = exports.UpdateTaxClassDto = exports.CreateTaxClassDto = exports.TaxRuleDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const supplied = (_, value) => value !== undefined;
class TaxRuleDto {
}
exports.TaxRuleDto = TaxRuleDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TaxRuleDto.prototype, "taxRateId", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsIn)(["shipping", "payment", "store"]),
    __metadata("design:type", String)
], TaxRuleDto.prototype, "basedOn", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], TaxRuleDto.prototype, "priority", void 0);
class CreateTaxClassDto {
}
exports.CreateTaxClassDto = CreateTaxClassDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateTaxClassDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(10000),
    __metadata("design:type", String)
], CreateTaxClassDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TaxRuleDto),
    __metadata("design:type", Array)
], CreateTaxClassDto.prototype, "rules", void 0);
class UpdateTaxClassDto {
}
exports.UpdateTaxClassDto = UpdateTaxClassDto;
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateTaxClassDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(10000),
    __metadata("design:type", String)
], UpdateTaxClassDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TaxRuleDto),
    __metadata("design:type", Array)
], UpdateTaxClassDto.prototype, "rules", void 0);
class BulkDeleteTaxClassDto {
}
exports.BulkDeleteTaxClassDto = BulkDeleteTaxClassDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ArrayUnique)((id) => typeof id === "string" ? id.toLowerCase() : id),
    (0, class_validator_1.IsUUID)("all", { each: true }),
    __metadata("design:type", Array)
], BulkDeleteTaxClassDto.prototype, "ids", void 0);
class CreateTaxRateDto {
}
exports.CreateTaxRateDto = CreateTaxRateDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateTaxRateDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.9999),
    __metadata("design:type", Number)
], CreateTaxRateDto.prototype, "rate", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsIn)(["percentage", "fixed"]),
    __metadata("design:type", String)
], CreateTaxRateDto.prototype, "type", void 0);
