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
exports.Product = void 0;
const typeorm_1 = require("typeorm");
const category_entity_1 = require("./category.entity");
const brand_entity_1 = require("./brand.entity");
const message_entity_1 = require("./message.entity");
const product_attribute_entity_1 = require("./product-attribute.entity");
const product_option_entity_1 = require("./product-option.entity");
const product_discount_entity_1 = require("./product-discount.entity");
const product_image_entity_1 = require("./product-image.entity");
const download_entity_1 = require("./download.entity");
let Product = class Product {
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true, length: 100 }),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true, length: 100 }),
    __metadata("design:type", String)
], Product.prototype, "mpn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 1 }),
    __metadata("design:type", Number)
], Product.prototype, "minimumQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "subtractStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", default: "out_of_stock", length: 30 }),
    __metadata("design:type", String)
], Product.prototype, "outOfStockStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "requiresShipping", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date", nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "dateAvailable", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", default: "inch", length: 20 }),
    __metadata("design:type", String)
], Product.prototype, "lengthClass", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", default: "pound", length: 20 }),
    __metadata("design:type", String)
], Product.prototype, "weightClass", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "wholesaleQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 1 }),
    __metadata("design:type", Number)
], Product.prototype, "wholesaleMinimumQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "wholesaleRequiresShipping", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date", nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "wholesaleDateAvailable", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", nullable: true, precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "wholesaleLength", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", nullable: true, precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "wholesaleWidth", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", nullable: true, precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "wholesaleHeight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", nullable: true, precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "wholesaleWeight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", default: "inch", length: 20 }),
    __metadata("design:type", String)
], Product.prototype, "wholesaleLengthClass", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", default: "pound", length: 20 }),
    __metadata("design:type", String)
], Product.prototype, "wholesaleWeightClass", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_attribute_entity_1.ProductAttribute, (row) => row.product),
    __metadata("design:type", Array)
], Product.prototype, "attributes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_option_entity_1.ProductOption, (row) => row.product),
    __metadata("design:type", Array)
], Product.prototype, "options", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_discount_entity_1.ProductDiscount, (row) => row.product),
    __metadata("design:type", Array)
], Product.prototype, "discounts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_image_entity_1.ProductImage, (row) => row.product),
    __metadata("design:type", Array)
], Product.prototype, "imageDetails", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => download_entity_1.Download),
    (0, typeorm_1.JoinTable)({
        name: "product_downloads",
        joinColumn: { name: "productId" },
        inverseJoinColumn: { name: "downloadId" },
    }),
    __metadata("design:type", Array)
], Product.prototype, "downloads", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Product),
    (0, typeorm_1.JoinTable)({
        name: "product_related",
        joinColumn: { name: "productId" },
        inverseJoinColumn: { name: "relatedProductId" },
    }),
    __metadata("design:type", Array)
], Product.prototype, "relatedProducts", void 0);
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Product.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Product.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { array: true, default: [] }),
    __metadata("design:type", Array)
], Product.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "discountPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "wholesalePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], Product.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", default: "0" }),
    __metadata("design:type", String)
], Product.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "wholesaleOrderQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "unitsPerCarton", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "length", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "width", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "height", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "inStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "tag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "package", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "metaTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "metaDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "metaKeyword", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => brand_entity_1.Brand, (brand) => brand.products, {
        nullable: true,
        onDelete: "SET NULL",
    }),
    (0, typeorm_1.JoinColumn)({ name: "brandId" }),
    __metadata("design:type", brand_entity_1.Brand)
], Product.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => category_entity_1.Category, (category) => category.products),
    (0, typeorm_1.JoinTable)({
        name: "product_categories",
        joinColumn: {
            name: "productId",
            referencedColumnName: "id",
        },
        inverseJoinColumn: {
            name: "categoryId",
            referencedColumnName: "id",
        },
    }),
    __metadata("design:type", Array)
], Product.prototype, "categories", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => message_entity_1.Message, (message) => message.products),
    __metadata("design:type", Array)
], Product.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Product.prototype, "updatedAt", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)("products")
], Product);
