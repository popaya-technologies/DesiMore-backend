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
exports.BulkDeleteLengthClassDto = exports.UpdateLengthClassDto = exports.CreateLengthClassDto = void 0;
const class_validator_1 = require("class-validator");
class CreateLengthClassDto {
}
exports.CreateLengthClassDto = CreateLengthClassDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateLengthClassDto.prototype, "lengthTitle", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], CreateLengthClassDto.prototype, "lengthUnit", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsNumber)({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 8 }),
    (0, class_validator_1.Min)(0.00000001),
    (0, class_validator_1.Max)(999999999999),
    __metadata("design:type", Number)
], CreateLengthClassDto.prototype, "value", void 0);
class UpdateLengthClassDto {
}
exports.UpdateLengthClassDto = UpdateLengthClassDto;
__decorate([
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateLengthClassDto.prototype, "lengthTitle", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], UpdateLengthClassDto.prototype, "lengthUnit", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsNumber)({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 8 }),
    (0, class_validator_1.Min)(0.00000001),
    (0, class_validator_1.Max)(999999999999),
    __metadata("design:type", Number)
], UpdateLengthClassDto.prototype, "value", void 0);
class BulkDeleteLengthClassDto {
}
exports.BulkDeleteLengthClassDto = BulkDeleteLengthClassDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ArrayUnique)((id) => typeof id === "string" ? id.toLowerCase() : id),
    (0, class_validator_1.IsUUID)("all", { each: true }),
    __metadata("design:type", Array)
], BulkDeleteLengthClassDto.prototype, "ids", void 0);
