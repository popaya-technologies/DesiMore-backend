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
exports.GeoZone = void 0;
const typeorm_1 = require("typeorm");
const geo_zone_location_entity_1 = require("./geo_zone_location.entity");
let GeoZone = class GeoZone {
};
exports.GeoZone = GeoZone;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], GeoZone.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 255,
        unique: true,
    }),
    __metadata("design:type", String)
], GeoZone.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
    }),
    __metadata("design:type", String)
], GeoZone.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => geo_zone_location_entity_1.GeoZoneLocation, (location) => location.geoZone, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], GeoZone.prototype, "locations", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], GeoZone.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], GeoZone.prototype, "updatedAt", void 0);
exports.GeoZone = GeoZone = __decorate([
    (0, typeorm_1.Entity)("geo_zones")
], GeoZone);
