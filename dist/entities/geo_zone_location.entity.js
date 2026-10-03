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
exports.GeoZoneLocation = void 0;
const typeorm_1 = require("typeorm");
const geo_zone_entity_1 = require("./geo_zone.entity");
const country_entity_1 = require("./country.entity");
const zone_entity_1 = require("./zone.entity");
let GeoZoneLocation = class GeoZoneLocation {
};
exports.GeoZoneLocation = GeoZoneLocation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], GeoZoneLocation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], GeoZoneLocation.prototype, "geoZoneId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => geo_zone_entity_1.GeoZone, (geoZone) => geoZone.locations, {
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "geoZoneId" }),
    __metadata("design:type", geo_zone_entity_1.GeoZone)
], GeoZoneLocation.prototype, "geoZone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], GeoZoneLocation.prototype, "countryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => country_entity_1.Country, {
        onDelete: "RESTRICT",
    }),
    (0, typeorm_1.JoinColumn)({ name: "countryId" }),
    __metadata("design:type", country_entity_1.Country)
], GeoZoneLocation.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], GeoZoneLocation.prototype, "zoneId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => zone_entity_1.Zone, {
        onDelete: "RESTRICT",
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: "zoneId" }),
    __metadata("design:type", zone_entity_1.Zone)
], GeoZoneLocation.prototype, "zone", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], GeoZoneLocation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], GeoZoneLocation.prototype, "updatedAt", void 0);
exports.GeoZoneLocation = GeoZoneLocation = __decorate([
    (0, typeorm_1.Entity)("geo_zone_locations")
], GeoZoneLocation);
