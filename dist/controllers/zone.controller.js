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
exports.ZoneController = void 0;
const data_source_1 = require("../data-source");
const country_entity_1 = require("../entities/country.entity");
const zone_entity_1 = require("../entities/zone.entity");
class ZoneController {
    static createZone(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const zoneRepository = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone);
                const countryRepository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const dto = req.body;
                const country = yield countryRepository.findOne({
                    where: {
                        id: dto.countryId,
                    },
                });
                if (!country) {
                    res.status(404).json({
                        message: "Country not found",
                    });
                    return;
                }
                const name = dto.name.trim();
                const existing = yield zoneRepository.findOne({
                    where: {
                        countryId: dto.countryId,
                        name,
                    },
                });
                if (existing) {
                    res.status(409).json({
                        message: "Zone already exists for this country",
                    });
                    return;
                }
                const zone = zoneRepository.create({
                    countryId: dto.countryId,
                    country,
                    name,
                    code: ((_a = dto.code) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                    status: dto.status,
                });
                const savedZone = yield zoneRepository.save(zone);
                const result = yield zoneRepository.findOne({
                    where: {
                        id: savedZone.id,
                    },
                    relations: {
                        country: true,
                    },
                });
                res.status(201).json(result);
            }
            catch (error) {
                console.error("Create zone error:", error);
                res.status(500).json({
                    message: "Failed to create zone",
                });
            }
        });
    }
    static getZones(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.max(Number(req.query.limit) || 10, 1);
                const queryBuilder = repository
                    .createQueryBuilder("zone")
                    .leftJoinAndSelect("zone.country", "country")
                    .orderBy("zone.createdAt", "ASC");
                if (search) {
                    queryBuilder.andWhere(`(
            zone.name ILIKE :search
            OR zone.code ILIKE :search
            OR country.name ILIKE :search
          )`, {
                        search: `%${search}%`,
                    });
                }
                const [data, total] = yield queryBuilder
                    .skip((page - 1) * limit)
                    .take(limit)
                    .getManyAndCount();
                res.json({
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
                console.error("Get zones error:", error);
                res.status(500).json({
                    message: "Failed to get zones",
                });
            }
        });
    }
    static getZoneById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone);
                const zone = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                    relations: {
                        country: true,
                    },
                });
                if (!zone) {
                    res.status(404).json({
                        message: "Zone not found",
                    });
                    return;
                }
                res.json(zone);
            }
            catch (error) {
                console.error("Get zone by id error:", error);
                res.status(500).json({
                    message: "Failed to get zone",
                });
            }
        });
    }
    static updateZone(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone);
                const countryRepository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const zone = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!zone) {
                    res.status(404).json({
                        message: "Zone not found",
                    });
                    return;
                }
                const dto = req.body;
                if (dto.countryId !== undefined) {
                    const country = yield countryRepository.findOne({
                        where: {
                            id: dto.countryId,
                        },
                    });
                    if (!country) {
                        res.status(404).json({
                            message: "Country not found",
                        });
                        return;
                    }
                    zone.countryId = dto.countryId;
                    zone.country = country;
                }
                if (dto.name !== undefined) {
                    zone.name = dto.name.trim();
                }
                if (dto.code !== undefined) {
                    zone.code = dto.code.trim() || null;
                }
                if (dto.status !== undefined) {
                    zone.status = dto.status;
                }
                const existing = yield repository.findOne({
                    where: {
                        countryId: zone.countryId,
                        name: zone.name,
                    },
                });
                if (existing &&
                    existing.id !== zone.id) {
                    res.status(409).json({
                        message: "Zone already exists for this country",
                    });
                    return;
                }
                yield repository.save(zone);
                const updatedZone = yield repository.findOne({
                    where: {
                        id: zone.id,
                    },
                    relations: {
                        country: true,
                    },
                });
                res.json(updatedZone);
            }
            catch (error) {
                console.error("Update zone error:", error);
                res.status(500).json({
                    message: "Failed to update zone",
                });
            }
        });
    }
    static deleteZone(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone);
                const zone = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!zone) {
                    res.status(404).json({
                        message: "Zone not found",
                    });
                    return;
                }
                yield repository.remove(zone);
                res.json({
                    message: "Zone deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete zone error:", error);
                res.status(500).json({
                    message: "Failed to delete zone",
                });
            }
        });
    }
}
exports.ZoneController = ZoneController;
