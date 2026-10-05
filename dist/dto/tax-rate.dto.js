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
exports.BulkDeleteTaxRateDto = exports.CreateTaxRateDto = exports.UpdateTaxRateDto = void 0;
const class_validator_1 = require("class-validator");
const supplied = (_, v) => v !== undefined;
class UpdateTaxRateDto {
}
exports.UpdateTaxRateDto = UpdateTaxRateDto;
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateTaxRateDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.9999),
    __metadata("design:type", Number)
], UpdateTaxRateDto.prototype, "rate", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsIn)(["percentage", "fixed"]),
    __metadata("design:type", String)
], UpdateTaxRateDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_o, v) => v !== undefined && v !== null),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateTaxRateDto.prototype, "geoZoneId", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ArrayUnique)((id) => typeof id === "string" ? id.toLowerCase() : id),
    (0, class_validator_1.IsUUID)("all", { each: true }),
    __metadata("design:type", Array)
], UpdateTaxRateDto.prototype, "customerGroupIds", void 0);
class CreateTaxRateDto extends UpdateTaxRateDto {
}
exports.CreateTaxRateDto = CreateTaxRateDto;
class BulkDeleteTaxRateDto {
}
exports.BulkDeleteTaxRateDto = BulkDeleteTaxRateDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ArrayUnique)((id) => typeof id === "string" ? id.toLowerCase() : id),
    (0, class_validator_1.IsUUID)("all", { each: true }),
    __metadata("design:type", Array)
], BulkDeleteTaxRateDto.prototype, "ids", void 0);
