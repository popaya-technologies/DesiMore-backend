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
exports.Page = exports.PAGE_PLACEMENTS = void 0;
const typeorm_1 = require("typeorm");
exports.PAGE_PLACEMENTS = ["footer_about_us", "footer_consumer", "footer_privacy", "top_menu", "none"];
let Page = class Page {
};
exports.Page = Page;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Page.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Page.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", default: "" }),
    __metadata("design:type", String)
], Page.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", default: () => "'[]'::jsonb" }),
    __metadata("design:type", Array)
], Page.prototype, "media", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, default: "" }),
    __metadata("design:type", String)
], Page.prototype, "metaTagTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", default: "" }),
    __metadata("design:type", String)
], Page.prototype, "metaTagDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", default: "" }),
    __metadata("design:type", String)
], Page.prototype, "metaTagKeywords", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 32, default: "none" }),
    __metadata("design:type", String)
], Page.prototype, "bottom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 0 }),
    __metadata("design:type", Number)
], Page.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Page.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, unique: true }),
    __metadata("design:type", String)
], Page.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Page.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Page.prototype, "updatedAt", void 0);
exports.Page = Page = __decorate([
    (0, typeorm_1.Entity)("pages")
], Page);
