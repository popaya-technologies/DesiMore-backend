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
exports.TaxQuoteDto = exports.TaxAddressDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
// Only the parts of an address that decide tax: country (ISO-2 code or name) and
// state (zone code or name). Other address fields are accepted and ignored.
class TaxAddressDto {
}
exports.TaxAddressDto = TaxAddressDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: "Country is required" }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], TaxAddressDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], TaxAddressDto.prototype, "state", void 0);
class TaxQuoteDto {
}
exports.TaxQuoteDto = TaxQuoteDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TaxQuoteDto.prototype, "cartId", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TaxAddressDto),
    __metadata("design:type", TaxAddressDto)
], TaxQuoteDto.prototype, "shippingAddress", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TaxAddressDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", TaxAddressDto)
], TaxQuoteDto.prototype, "paymentAddress", void 0);
