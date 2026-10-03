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
const data_source_1 = require("../data-source");
const geo_zone_entity_1 = require("../entities/geo_zone.entity");
const geo_zone_location_entity_1 = require("../entities/geo_zone_location.entity");
const country_entity_1 = require("../entities/country.entity");
const zone_entity_1 = require("../entities/zone.entity");
class GeoZoneController {
    static createGeoZone(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dto = req.body;
                const geoZoneRepository = data_source_1.AppDataSource.getRepository(geo_zone_entity_1.GeoZone);
                const countryRepository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const zoneRepository = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone);
                const existingGeoZone = yield geoZoneRepository.findOne({
                    where: {
                        name: dto.name.trim(),
                    },
                });
                if (existingGeoZone) {
                    res.status(409).json({
                        message: "Geo Zone with this name already exists",
                    });
                    return;
                }
                if (!dto.locations || dto.locations.length === 0) {
                    res.status(400).json({
                        message: "At least one Geo Zone location is required",
                    });
                    return;
                }
                const countryIds = [
                    ...new Set(dto.locations.map((location) => location.countryId)),
                ];
                const countries = yield countryRepository.findByIds(countryIds);
                if (countries.length !== countryIds.length) {
                    res.status(400).json({
                        message: "One or more countries are invalid",
                    });
                    return;
                }
                const zoneIds = [
                    ...new Set(dto.locations
                        .map((location) => location.zoneId)
                        .filter((zoneId) => Boolean(zoneId))),
                ];
                const zones = zoneIds.length > 0
                    ? yield zoneRepository.findByIds(zoneIds)
                    : [];
                if (zones.length !== zoneIds.length) {
                    res.status(400).json({
                        message: "One or more zones are invalid",
                    });
                    return;
                }
                const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
                for (const location of dto.locations) {
                    if (!location.zoneId) {
                        continue;
                    }
                    const zone = zoneMap.get(location.zoneId);
                    if (!zone) {
                        res.status(400).json({
                            message: "Invalid zone",
                        });
                        return;
                    }
                    if (zone.countryId !== location.countryId) {
                        res.status(400).json({
                            message: "Selected zone does not belong to the selected country",
                        });
                        return;
                    }
                }
                const geoZone = geoZoneRepository.create({
                    name: dto.name.trim(),
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
                    relations: [
                        "locations",
                        "locations.country",
                        "locations.zone",
                    ],
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
                const limit = Math.max(Number(req.query.limit) || 10, 1);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const queryBuilder = geoZoneRepository
                    .createQueryBuilder("geoZone")
                    .leftJoinAndSelect("geoZone.locations", "location")
                    .leftJoinAndSelect("location.country", "country")
                    .leftJoinAndSelect("location.zone", "zone");
                if (search) {
                    queryBuilder.where("LOWER(geoZone.name) LIKE LOWER(:search) OR LOWER(geoZone.description) LIKE LOWER(:search)", {
                        search: `%${search}%`,
                    });
                }
                queryBuilder
                    .orderBy("geoZone.createdAt", "DESC")
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
                    relations: [
                        "locations",
                        "locations.country",
                        "locations.zone",
                    ],
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
                const dto = req.body;
                const geoZoneRepository = data_source_1.AppDataSource.getRepository(geo_zone_entity_1.GeoZone);
                const geoZoneLocationRepository = data_source_1.AppDataSource.getRepository(geo_zone_location_entity_1.GeoZoneLocation);
                const countryRepository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const zoneRepository = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone);
                const geoZone = yield geoZoneRepository.findOne({
                    where: { id },
                });
                if (!geoZone) {
                    res.status(404).json({
                        message: "Geo Zone not found",
                    });
                    return;
                }
                // Check duplicate name
                if (dto.name !== undefined) {
                    const name = dto.name.trim();
                    const existingGeoZone = yield geoZoneRepository.findOne({
                        where: {
                            name,
                        },
                    });
                    if (existingGeoZone &&
                        existingGeoZone.id !== id) {
                        res.status(409).json({
                            message: "Geo Zone with this name already exists",
                        });
                        return;
                    }
                    geoZone.name = name;
                }
                // Update description
                if (dto.description !== undefined) {
                    geoZone.description = dto.description.trim();
                }
                // Update Country + Zone mappings
                if (dto.locations !== undefined) {
                    if (dto.locations.length === 0) {
                        res.status(400).json({
                            message: "At least one Geo Zone location is required",
                        });
                        return;
                    }
                    // Validate countries
                    const countryIds = [
                        ...new Set(dto.locations.map((location) => location.countryId)),
                    ];
                    const countries = yield countryRepository.findByIds(countryIds);
                    if (countries.length !== countryIds.length) {
                        res.status(400).json({
                            message: "One or more countries are invalid",
                        });
                        return;
                    }
                    // Validate zones
                    const zoneIds = [
                        ...new Set(dto.locations
                            .map((location) => location.zoneId)
                            .filter((zoneId) => Boolean(zoneId))),
                    ];
                    const zones = zoneIds.length > 0
                        ? yield zoneRepository.findByIds(zoneIds)
                        : [];
                    if (zones.length !== zoneIds.length) {
                        res.status(400).json({
                            message: "One or more zones are invalid",
                        });
                        return;
                    }
                    const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
                    // Make sure selected Zone belongs to selected Country
                    for (const location of dto.locations) {
                        if (!location.zoneId) {
                            continue;
                        }
                        const zone = zoneMap.get(location.zoneId);
                        if (!zone ||
                            zone.countryId !== location.countryId) {
                            res.status(400).json({
                                message: "Selected zone does not belong to the selected country",
                            });
                            return;
                        }
                    }
                    /*
                     * Delete existing mappings first.
                     *
                     * Then create the new mappings from the request.
                     * This is safer than trying to update the OneToMany
                     * relation through GeoZone.save().
                     */
                    yield geoZoneLocationRepository.delete({
                        geoZoneId: id,
                    });
                    const locations = dto.locations.map((location) => {
                        var _a;
                        return geoZoneLocationRepository.create({
                            geoZoneId: id,
                            countryId: location.countryId,
                            zoneId: (_a = location.zoneId) !== null && _a !== void 0 ? _a : null,
                        });
                    });
                    yield geoZoneLocationRepository.save(locations);
                }
                // Save Geo Zone itself
                yield geoZoneRepository.save(geoZone);
                // Return updated Geo Zone with relations
                const result = yield geoZoneRepository.findOne({
                    where: { id },
                    relations: [
                        "locations",
                        "locations.country",
                        "locations.zone",
                    ],
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
