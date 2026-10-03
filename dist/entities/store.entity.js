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
exports.Store = void 0;
const typeorm_1 = require("typeorm");
let Store = class Store {
};
exports.Store = Store;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Store.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "metaTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "metaTagDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "metaTagKeywords", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 255,
    }),
    __metadata("design:type", String)
], Store.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
    }),
    __metadata("design:type", String)
], Store.prototype, "storeOwner", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
    }),
    __metadata("design:type", String)
], Store.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "geocode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 255,
    }),
    __metadata("design:type", String)
], Store.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 100,
    }),
    __metadata("design:type", String)
], Store.prototype, "telephone", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 100,
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "fax", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "image", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "openingTimes", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 100,
        default: "United States",
    }),
    __metadata("design:type", String)
], Store.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 150,
        default: "New Jersey",
    }),
    __metadata("design:type", String)
], Store.prototype, "regionState", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 100,
        default: "English",
    }),
    __metadata("design:type", String)
], Store.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 100,
        default: "US Dollar",
    }),
    __metadata("design:type", String)
], Store.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: false,
    }),
    __metadata("design:type", Boolean)
], Store.prototype, "displayPricesWithTax", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "useStoreTaxAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "useCustomerTaxAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 150,
        default: "Default",
    }),
    __metadata("design:type", String)
], Store.prototype, "customerGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        array: true,
        default: () => "ARRAY[]::text[]",
    }),
    __metadata("design:type", Array)
], Store.prototype, "customerGroups", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "accountTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: false,
    }),
    __metadata("design:type", Boolean)
], Store.prototype, "displayWeightOnCartPage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: false,
    }),
    __metadata("design:type", Boolean)
], Store.prototype, "guestCheckout", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "checkoutTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 100,
        default: "Canceled",
    }),
    __metadata("design:type", String)
], Store.prototype, "orderStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: false,
    }),
    __metadata("design:type", Boolean)
], Store.prototype, "displayStock", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: false,
    }),
    __metadata("design:type", Boolean)
], Store.prototype, "stockCheckout", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "storeLogo", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        default: "",
    }),
    __metadata("design:type", String)
], Store.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
    }),
    __metadata("design:type", String)
], Store.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: false,
    }),
    __metadata("design:type", Boolean)
], Store.prototype, "useSsl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "boolean",
        default: false,
    }),
    __metadata("design:type", Boolean)
], Store.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Store.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Store.prototype, "updatedAt", void 0);
exports.Store = Store = __decorate([
    (0, typeorm_1.Entity)("stores")
], Store);
