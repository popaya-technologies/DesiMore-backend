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
exports.UpdateBannerDto = exports.CreateBannerDto = exports.BannerSlideDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const supplied = (_, value) => value !== undefined;
class BannerSlideDto {
}
exports.BannerSlideDto = BannerSlideDto;
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], BannerSlideDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], BannerSlideDto.prototype, "link", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], BannerSlideDto.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], BannerSlideDto.prototype, "sortOrder", void 0);
class CreateBannerDto {
}
exports.CreateBannerDto = CreateBannerDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateBannerDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateBannerDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BannerSlideDto),
    __metadata("design:type", Array)
], CreateBannerDto.prototype, "slides", void 0);
class UpdateBannerDto {
}
exports.UpdateBannerDto = UpdateBannerDto;
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateBannerDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateBannerDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(supplied),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BannerSlideDto),
    __metadata("design:type", Array)
], UpdateBannerDto.prototype, "slides", void 0);
