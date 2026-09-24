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
exports.UpdateProductDto = exports.CreateProductDto = exports.PackageDimensionsDto = exports.DownloadDto = exports.ProductImageDto = exports.DiscountDto = exports.OptionDto = exports.OptionValueDto = exports.AttributeDto = exports.CUSTOMER_GROUPS = exports.OPTION_TYPES = exports.STOCK_STATUSES = exports.WEIGHT_CLASSES = exports.LENGTH_CLASSES = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
exports.LENGTH_CLASSES = ["inch", "centimeter", "millimeter"];
exports.WEIGHT_CLASSES = ["pound", "kilogram", "gram", "ounce"];
exports.STOCK_STATUSES = [
    "out_of_stock",
    "in_stock",
    "pre_order",
    "2_3_days",
];
exports.OPTION_TYPES = [
    "checkbox",
    "select",
    "radio",
    "text",
    "textarea",
    "date",
    "time",
    "datetime",
];
exports.CUSTOMER_GROUPS = ["default", "wholesaler"];
const optional = (_, value) => value !== undefined;
const nullable = (_, value) => value !== undefined && value !== null;
class AttributeDto {
}
exports.AttributeDto = AttributeDto;
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AttributeDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_validator_1.Matches)(/\S/),
    __metadata("design:type", String)
], AttributeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50000),
    __metadata("design:type", String)
], AttributeDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AttributeDto.prototype, "sortOrder", void 0);
class OptionValueDto {
}
exports.OptionValueDto = OptionValueDto;
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], OptionValueDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_validator_1.Matches)(/\S/),
    __metadata("design:type", String)
], OptionValueDto.prototype, "value", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], OptionValueDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], OptionValueDto.prototype, "subtractStock", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsIn)(["+", "-"]),
    __metadata("design:type", String)
], OptionValueDto.prototype, "pricePrefix", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], OptionValueDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsIn)(["+", "-"]),
    __metadata("design:type", String)
], OptionValueDto.prototype, "pointsPrefix", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], OptionValueDto.prototype, "points", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsIn)(["+", "-"]),
    __metadata("design:type", String)
], OptionValueDto.prototype, "weightPrefix", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], OptionValueDto.prototype, "weight", void 0);
class OptionDto {
}
exports.OptionDto = OptionDto;
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], OptionDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_validator_1.Matches)(/\S/),
    __metadata("design:type", String)
], OptionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.OPTION_TYPES),
    __metadata("design:type", String)
], OptionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], OptionDto.prototype, "required", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OptionDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OptionValueDto),
    __metadata("design:type", Array)
], OptionDto.prototype, "values", void 0);
class DiscountDto {
}
exports.DiscountDto = DiscountDto;
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DiscountDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.CUSTOMER_GROUPS),
    __metadata("design:type", String)
], DiscountDto.prototype, "customerGroup", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], DiscountDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], DiscountDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], DiscountDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsDateString)({ strict: true }),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], DiscountDto.prototype, "dateStart", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsDateString)({ strict: true }),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], DiscountDto.prototype, "dateEnd", void 0);
class ProductImageDto {
}
exports.ProductImageDto = ProductImageDto;
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ProductImageDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], ProductImageDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProductImageDto.prototype, "isMain", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductImageDto.prototype, "sortOrder", void 0);
class DownloadDto {
}
exports.DownloadDto = DownloadDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], DownloadDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], DownloadDto.prototype, "url", void 0);
class PackageDimensionsDto {
}
exports.PackageDimensionsDto = PackageDimensionsDto;
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PackageDimensionsDto.prototype, "length", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PackageDimensionsDto.prototype, "width", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PackageDimensionsDto.prototype, "height", void 0);
class CreateProductDto {
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateProductDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateProductDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/\S/),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateProductDto.prototype, "metaTitle", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100000),
    __metadata("design:type", String)
], CreateProductDto.prototype, "summary", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateProductDto.prototype, "sku", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateProductDto.prototype, "mpn", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateProductDto.prototype, "metaDescription", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateProductDto.prototype, "metaKeyword", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateProductDto.prototype, "tag", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "discountPrice", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "wholesalePrice", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "weight", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "length", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "width", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "height", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "wholesaleWeight", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "wholesaleLength", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "wholesaleWidth", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(99999999.99),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "wholesaleHeight", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === "number" ? String(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{1,9}$/),
    __metadata("design:type", String)
], CreateProductDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "unitsPerCarton", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === "number" ? String(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[1-9]\d{0,8}$/),
    __metadata("design:type", String)
], CreateProductDto.prototype, "wholesaleOrderQuantity", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "minimumQuantity", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "wholesaleMinimumQuantity", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2147483647),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "wholesaleQuantity", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "inStock", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "subtractStock", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "requiresShipping", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "wholesaleRequiresShipping", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsDateString)({ strict: true }),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], CreateProductDto.prototype, "dateAvailable", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsDateString)({ strict: true }),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], CreateProductDto.prototype, "wholesaleDateAvailable", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsIn)(exports.LENGTH_CLASSES),
    __metadata("design:type", String)
], CreateProductDto.prototype, "lengthClass", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsIn)(exports.LENGTH_CLASSES),
    __metadata("design:type", String)
], CreateProductDto.prototype, "wholesaleLengthClass", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsIn)(exports.WEIGHT_CLASSES),
    __metadata("design:type", String)
], CreateProductDto.prototype, "weightClass", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsIn)(exports.WEIGHT_CLASSES),
    __metadata("design:type", String)
], CreateProductDto.prototype, "wholesaleWeightClass", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsIn)(exports.STOCK_STATUSES),
    __metadata("design:type", String)
], CreateProductDto.prototype, "outOfStockStatus", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "brandId", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsUUID)(undefined, { each: true }),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "categoryIds", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsUUID)(undefined, { each: true }),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "relatedProductIds", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsUUID)(undefined, { each: true }),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "downloadIds", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "images", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AttributeDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "attributes", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OptionDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DiscountDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "discounts", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(optional),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ProductImageDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "imageDetails", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(nullable),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PackageDimensionsDto),
    __metadata("design:type", PackageDimensionsDto)
], CreateProductDto.prototype, "package", void 0);
class UpdateProductDto extends CreateProductDto {
}
exports.UpdateProductDto = UpdateProductDto;
