"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoZoneController = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const geo_zone_entity_1 = require("../entities/geo_zone.entity");
const geo_zone_location_entity_1 = require("../entities/geo_zone_location.entity");
const country_entity_1 = require("../entities/country.entity");
const tax_class_entity_1 = require("../entities/tax-class.entity");
const zone_entity_1 = require("../entities/zone.entity");
const geo_zone_dto_1 = require("../dto/geo_zone.dto");
// Location rows are nested, so collect constraint messages from every level.
const collectMessages = (errors) => errors.flatMap((error) => {
    var _a, _b;
    return [
        ...Object.values((_a = error.constraints) !== null && _a !== void 0 ? _a : {}),
        ...collectMessages((_b = error.children) !== null && _b !== void 0 ? _b : []),
    ];
});
const validationErrors = (dto) => __awaiter(void 0, void 0, void 0, function* () {
    return collectMessages(yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
});
// Geo zone names are unique regardless of upper/lower case.
const isNameTaken = (name, excludeId) => __awaiter(void 0, void 0, void 0, function* () {
    const query = data_source_1.AppDataSource.getRepository(geo_zone_entity_1.GeoZone)
        .createQueryBuilder("geoZone")
        .select(["geoZone.id"])
        .where("LOWER(geoZone.name) = LOWER(:name)", { name });
    if (excludeId) {
        query.andWhere("geoZone.id != :excludeId", { excludeId });
    }
    return Boolean(yield query.getOne());
});
// Returns an error message when the Country + Zone rows are invalid, otherwise null.
const checkLocations = (locations) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (locations.length === 0) {
        return "At least one Geo Zone location is required";
    }
    const countryIds = [...new Set(locations.map((row) => row.countryId))];
    const countries = yield data_source_1.AppDataSource.getRepository(country_entity_1.Country).findBy({
        id: (0, typeorm_1.In)(countryIds),
    });
    if (countries.length !== countryIds.length) {
        return "One or more countries are invalid";
    }
    const zoneIds = [
        ...new Set(locations
            .map((row) => row.zoneId)
            .filter((zoneId) => Boolean(zoneId))),
    ];
    const zones = zoneIds.length
        ? yield data_source_1.AppDataSource.getRepository(zone_entity_1.Zone).findBy({ id: (0, typeorm_1.In)(zoneIds) })
        : [];
    if (zones.length !== zoneIds.length) {
        return "One or more zones are invalid";
    }
    const countryName = new Map(countries.map((c) => [c.id, c.name]));
    const zoneById = new Map(zones.map((z) => [z.id, z]));
    const seen = new Set();
    const allZonesCountries = new Set(locations.filter((row) => !row.zoneId).map((row) => row.countryId));
    for (const row of locations) {
        const country = countryName.get(row.countryId);
        if (row.zoneId) {
            const zone = zoneById.get(row.zoneId);
            if (!zone || zone.countryId !== row.countryId) {
                return "Selected zone does not belong to the selected country";
            }
            // "All Zones" already covers every zone of the country.
            if (allZonesCountries.has(row.countryId)) {
                return `${country} is already added with All Zones. Remove the other ${country} rows.`;
            }
        }
        const key = `${row.countryId}|${(_a = row.zoneId) !== null && _a !== void 0 ? _a : "all"}`;
        if (seen.has(key)) {
            const zoneName = row.zoneId
                ? (_b = zoneById.get(row.zoneId)) === null || _b === void 0 ? void 0 : _b.name
                : "All Zones";
            return `${country} - ${zoneName} is added more than once`;
        }
        seen.add(key);
    }
    return null;
});
const geoZoneRelations = [
    "locations",
    "locations.country",
    "locations.zone",
];
class GeoZoneController {
    static createGeoZone(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dto = (0, class_transformer_1.plainToInstance)(geo_zone_dto_1.CreateGeoZoneDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
                const geoZoneRepository = data_source_1.AppDataSource.getRepository(geo_zone_entity_1.GeoZone);
                const name = dto.name.trim();
                if (yield isNameTaken(name)) {
                    res.status(409).json({
                        message: "Geo Zone with this name already exists",
                    });
                    return;
                }
                const locationError = yield checkLocations(dto.locations);
                if (locationError) {
                    res.status(400).json({
                        message: locationError,
                    });
                    return;
                }
                const geoZone = geoZoneRepository.create({
                    name,
                    description: dto.description.trim(),
                    locations: dto.locations.map((location) => {
                        var _a;
                        return ({
                            countryId: location.countryId,
                            zoneId: (_a = location.zoneId) !== null && _a !== void 0 ? _a : null,
                        });
                    }),
                });
                const savedGeoZone = yield geoZoneRepository.save(geoZone);
                const result = yield geoZoneRepository.findOne({
                    where: {
                        id: savedGeoZone.id,
                    },
                    relations: geoZoneRelations,
                });
                res.status(201).json(result);
            }
            catch (error) {
                console.error("Create Geo Zone error:", error);
                res.status(500).json({
                    message: "Failed to create Geo Zone",
                });
            }
        });
    }
    static getGeoZones(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const geoZoneRepository = data_source_1.AppDataSource.getRepository(geo_zone_entity_1.GeoZone);
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
                // Column sorting from the admin list; default is name A-Z (the old site's order).
                const sortColumns = {
                    name: "geoZone.name",
                    description: "geoZone.description",
                };
                const sortBy = typeof req.query.sortBy === "string" &&
                    // Own keys only: names like "constructor" or "__proto__" must not
                    // resolve to built-in object properties.
                    Object.prototype.hasOwnProperty.call(sortColumns, req.query.sortBy)
                    ? sortColumns[req.query.sortBy]
                    : sortColumns.name;
                const sortOrder = String(req.query.sortOrder).toUpperCase() === "DESC"
                    ? "DESC"
                    : "ASC";
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const queryBuilder = geoZoneRepository
                    .createQueryBuilder("geoZone")
                    .leftJoinAndSelect("geoZone.locations", "location")
                    .leftJoinAndSelect("location.country", "country")
                    .leftJoinAndSelect("location.zone", "zone");
                if (search) {
                    queryBuilder.where("(geoZone.name ILIKE :search OR geoZone.description ILIKE :search)", {
                        search: `%${search}%`,
                    });
                }
                queryBuilder
                    .orderBy(sortBy, sortOrder)
                    .addOrderBy("geoZone.name", "ASC")
                    .skip((page - 1) * limit)
                    .take(limit);
                const [data, total] = yield queryBuilder.getManyAndCount();
                res.status(200).json({
                    data,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Get Geo Zones error:", error);
                res.status(500).json({
                    message: "Failed to get Geo Zones",
                });
            }
        });
    }
    static getGeoZoneById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const geoZoneRepository = data_source_1.AppDataSource.getRepository(geo_zone_entity_1.GeoZone);
                const geoZone = yield geoZoneRepository.findOne({
                    where: { id },
                    relations: geoZoneRelations,
                });
                if (!geoZone) {
                    res.status(404).json({
                        message: "Geo Zone not found",
                    });
                    return;
                }
                res.status(200).json(geoZone);
            }
            catch (error) {
                console.error("Get Geo Zone error:", error);
                res.status(500).json({
                    message: "Failed to get Geo Zone",
                });
            }
        });
    }
    static updateGeoZone(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const dto = (0, class_transformer_1.plainToInstance)(geo_zone_dto_1.UpdateGeoZoneDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
                const geoZoneRepository = data_source_1.AppDataSource.getRepository(geo_zone_entity_1.GeoZone);
                const geoZone = yield geoZoneRepository.findOne({
                    where: { id },
                });
                if (!geoZone) {
                    res.status(404).json({
                        message: "Geo Zone not found",
                    });
                    return;
                }
                if (dto.name !== undefined) {
                    const name = dto.name.trim();
                    if (yield isNameTaken(name, id)) {
                        res.status(409).json({
                            message: "Geo Zone with this name already exists",
                        });
                        return;
                    }
                    geoZone.name = name;
                }
                if (dto.description !== undefined) {
                    geoZone.description = dto.description.trim();
                }
                if (dto.locations !== undefined) {
                    const locationError = yield checkLocations(dto.locations);
                    if (locationError) {
                        res.status(400).json({
                            message: locationError,
                        });
                        return;
                    }
                }
                // Replace the Country + Zone rows and save the geo zone together, so a
                // failure cannot leave the geo zone without its rows.
                yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    if (dto.locations !== undefined) {
                        yield manager.delete(geo_zone_location_entity_1.GeoZoneLocation, { geoZoneId: id });
                        yield manager.save(dto.locations.map((location) => {
                            var _a;
                            return manager.create(geo_zone_location_entity_1.GeoZoneLocation, {
                                geoZoneId: id,
                                countryId: location.countryId,
                                zoneId: (_a = location.zoneId) !== null && _a !== void 0 ? _a : null,
                            });
                        }));
                    }
                    yield manager.save(geoZone);
                }));
                const result = yield geoZoneRepository.findOne({
                    where: { id },
                    relations: geoZoneRelations,
                });
                res.status(200).json(result);
            }
            catch (error) {
                console.error("Update Geo Zone error:", error);
                res.status(500).json({
                    message: "Failed to update Geo Zone",
                });
            }
        });
    }
    static deleteGeoZone(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const geoZoneRepository = data_source_1.AppDataSource.getRepository(geo_zone_entity_1.GeoZone);
                const geoZone = yield geoZoneRepository.findOne({
                    where: { id },
                });
                if (!geoZone) {
                    res.status(404).json({
                        message: "Geo Zone not found",
                    });
                    return;
                }
                // Tax rates point to their geo zone (RESTRICT), like OpenCart's delete check.
                const taxRateCount = yield data_source_1.AppDataSource.getRepository(tax_class_entity_1.TaxRate).count({
                    where: { geoZoneId: id },
                });
                if (taxRateCount > 0) {
                    res.status(409).json({
                        message: `${geoZone.name} is used by ${taxRateCount} tax rate${taxRateCount === 1 ? "" : "s"}. Change them first.`,
                    });
                    return;
                }
                yield geoZoneRepository.remove(geoZone);
                res.status(200).json({
                    message: "Geo Zone deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete Geo Zone error:", error);
                res.status(500).json({
                    message: "Failed to delete Geo Zone",
                });
            }
        });
    }
}
exports.GeoZoneController = GeoZoneController;
