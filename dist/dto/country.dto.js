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
exports.UpdateCountryDto = exports.CreateCountryDto = void 0;
const class_validator_1 = require("class-validator");
// An empty string clears the code; otherwise it must be letters only.
const ISO2_PATTERN = /^([A-Za-z]{2})?$/;
const ISO3_PATTERN = /^([A-Za-z]{3})?$/;
class CreateCountryDto {
}
exports.CreateCountryDto = CreateCountryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: "Country name is required" }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(ISO2_PATTERN, {
        message: "ISO Code (2) must be exactly 2 letters",
    }),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "isoCode2", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(ISO3_PATTERN, {
        message: "ISO Code (3) must be exactly 3 letters",
    }),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "isoCode3", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "addressFormat", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCountryDto.prototype, "postcodeRequired", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCountryDto.prototype, "status", void 0);
class UpdateCountryDto {
}
exports.UpdateCountryDto = UpdateCountryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: "Country name is required" }),
    (0, class_validator_1.MaxLength)(255),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCountryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(ISO2_PATTERN, {
        message: "ISO Code (2) must be exactly 2 letters",
    }),
    __metadata("design:type", String)
], UpdateCountryDto.prototype, "isoCode2", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(ISO3_PATTERN, {
        message: "ISO Code (3) must be exactly 3 letters",
    }),
    __metadata("design:type", String)
], UpdateCountryDto.prototype, "isoCode3", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdateCountryDto.prototype, "addressFormat", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateCountryDto.prototype, "postcodeRequired", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateCountryDto.prototype, "status", void 0);
