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
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const zone_dto_1 = require("../dto/zone.dto");
const country_entity_1 = require("../entities/country.entity");
const geo_zone_location_entity_1 = require("../entities/geo_zone_location.entity");
const store_entity_1 = require("../entities/store.entity");
const zone_entity_1 = require("../entities/zone.entity");
const validationErrors = (dto) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
    });
    return errors.flatMap((error) => { var _a; return Object.values((_a = error.constraints) !== null && _a !== void 0 ? _a : {}); });
});
const normalizeCode = (value) => (value === null || value === void 0 ? void 0 : value.trim().toUpperCase()) || null;
// Returns a message when the name or code is already used by another zone of the same country.
const findConflict = (values, excludeId) => __awaiter(void 0, void 0, void 0, function* () {
    const checks = [
        ["Zone already exists for this country", "LOWER(zone.name) = LOWER(:value)", values.name],
        ["Zone code is already used by another zone of this country", "UPPER(zone.code) = :value", values.code],
    ];
    for (const [message, condition, value] of checks) {
        if (!value)
            continue;
        const query = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone)
            .createQueryBuilder("zone")
            .select(["zone.id"])
            .where("zone.countryId = :countryId", { countryId: values.countryId })
            .andWhere(condition, { value });
        if (excludeId) {
            query.andWhere("zone.id != :excludeId", { excludeId });
        }
        if (yield query.getOne()) {
            return message;
        }
    }
    return null;
});
const countGeoZoneUsage = (zoneId) => data_source_1.AppDataSource.getRepository(geo_zone_location_entity_1.GeoZoneLocation).count({
    where: { zoneId },
});
// Stores keep country and region/state as free text, so a zone is "used" when the
// store's region matches its name or code and the store's country matches its country.
const countStoreUsage = (zone) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const country = (_a = zone.country) !== null && _a !== void 0 ? _a : (yield data_source_1.AppDataSource.getRepository(country_entity_1.Country).findOne({
        where: { id: zone.countryId },
    }));
    if (!country)
        return 0;
    const lower = (values) => values
        .filter((value) => Boolean(value))
        .map((value) => value.trim().toLowerCase());
    return data_source_1.AppDataSource.getRepository(store_entity_1.Store)
        .createQueryBuilder("store")
        .where("LOWER(TRIM(store.regionState)) IN (:...zoneValues)", {
        zoneValues: lower([zone.name, zone.code]),
    })
        .andWhere("LOWER(TRIM(store.country)) IN (:...countryValues)", {
        countryValues: lower([country.name, country.isoCode2, country.isoCode3]),
    })
        .getCount();
});
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
class ZoneController {
    static createZone(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const zoneRepository = data_source_1.AppDataSource.getRepository(zone_entity_1.Zone);
                const countryRepository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const dto = (0, class_transformer_1.plainToInstance)(zone_dto_1.CreateZoneDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
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
                const code = normalizeCode(dto.code);
                const conflict = yield findConflict({
                    countryId: country.id,
                    name,
                    code,
                });
                if (conflict) {
                    res.status(409).json({
                        message: conflict,
                    });
                    return;
                }
                const zone = zoneRepository.create({
                    countryId: country.id,
                    country,
                    name,
                    code,
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
                const status = typeof req.query.status === "string"
                    ? req.query.status.trim().toLowerCase()
                    : "";
                // The admin country filter can send several ids ("id1,id2").
                const countryIds = typeof req.query.countryId === "string"
                    ? req.query.countryId
                        .split(",")
                        .map((id) => id.trim())
                        .filter(Boolean)
                    : [];
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
                // Column sorting from the admin list; default is country, then zone name
                // (the old site's order).
                const sortColumns = {
                    country: "country.name",
                    name: "zone.name",
                    code: "zone.code",
                };
                const sortBy = typeof req.query.sortBy === "string" &&
                    sortColumns[req.query.sortBy]
                    ? sortColumns[req.query.sortBy]
                    : sortColumns.country;
                const sortOrder = String(req.query.sortOrder).toUpperCase() === "DESC"
                    ? "DESC"
                    : "ASC";
                const queryBuilder = repository
                    .createQueryBuilder("zone")
                    .leftJoinAndSelect("zone.country", "country")
                    .orderBy(sortBy, sortOrder, "NULLS LAST")
                    .addOrderBy("country.name", "ASC")
                    .addOrderBy("zone.name", "ASC");
                if (countryIds.length) {
                    queryBuilder.andWhere("zone.countryId IN (:...countryIds)", {
                        countryIds,
                    });
                }
                if (status === "enabled" || status === "true") {
                    queryBuilder.andWhere("zone.status = :status", { status: true });
                }
                else if (status === "disabled" || status === "false") {
                    queryBuilder.andWhere("zone.status = :status", { status: false });
                }
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
    // Storefront: enabled zones of one enabled country, looked up by ISO-2 code or id.
    // The main store's Region / State is marked isDefault so checkout can pre-select it.
    static getEnabledZones(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const countryParam = typeof req.query.country === "string"
                    ? req.query.country.trim()
                    : "";
                if (!countryParam) {
                    res.status(400).json({
                        message: "country is required",
                    });
                    return;
                }
                const country = yield data_source_1.AppDataSource.getRepository(country_entity_1.Country)
                    .createQueryBuilder("country")
                    .where("country.status = :status", { status: true })
                    .andWhere("(UPPER(country.isoCode2) = :code OR CAST(country.id AS TEXT) = :value)", { code: countryParam.toUpperCase(), value: countryParam })
                    .getOne();
                if (!country) {
                    res.json({ data: [] });
                    return;
                }
                const [zones, [store]] = yield Promise.all([
                    data_source_1.AppDataSource.getRepository(zone_entity_1.Zone).find({
                        where: { countryId: country.id, status: true },
                        select: ["id", "name", "code", "countryId"],
                        order: { name: "ASC" },
                    }),
                    data_source_1.AppDataSource.getRepository(store_entity_1.Store).find({
                        select: ["id", "country", "regionState"],
                        order: { createdAt: "ASC" },
                        take: 1,
                    }),
                ]);
                const lower = (value) => (value === null || value === void 0 ? void 0 : value.trim().toLowerCase()) || "";
                const storeCountry = lower(store === null || store === void 0 ? void 0 : store.country);
                const storeRegion = lower(store === null || store === void 0 ? void 0 : store.regionState);
                const isStoreCountry = Boolean(storeCountry) &&
                    [country.name, country.isoCode2, country.isoCode3]
                        .map(lower)
                        .includes(storeCountry);
                res.json({
                    data: zones.map((zone) => (Object.assign(Object.assign({}, zone), { isDefault: isStoreCountry &&
                            Boolean(storeRegion) &&
                            [lower(zone.name), lower(zone.code)].includes(storeRegion) }))),
                });
            }
            catch (error) {
                console.error("Get enabled zones error:", error);
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
                const dto = (0, class_transformer_1.plainToInstance)(zone_dto_1.UpdateZoneDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
                if (dto.countryId !== undefined &&
                    dto.countryId !== zone.countryId) {
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
                    // Geo zone locations store the zone together with its country.
                    const geoZoneUsage = yield countGeoZoneUsage(zone.id);
                    if (geoZoneUsage > 0) {
                        res.status(409).json({
                            message: `${zone.name} is used by ${plural(geoZoneUsage, "geo zone location")}, so its country cannot be changed. Remove it from those geo zones first.`,
                        });
                        return;
                    }
                    zone.countryId = country.id;
                    zone.country = country;
                }
                if (dto.name !== undefined) {
                    zone.name = dto.name.trim();
                }
                if (dto.code !== undefined) {
                    zone.code = normalizeCode(dto.code);
                }
                if (dto.status !== undefined) {
                    zone.status = dto.status;
                }
                const conflict = yield findConflict({
                    countryId: zone.countryId,
                    name: zone.name,
                    code: zone.code,
                }, zone.id);
                if (conflict) {
                    res.status(409).json({
                        message: conflict,
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
                const [geoZoneUsage, storeUsage] = yield Promise.all([
                    countGeoZoneUsage(zone.id),
                    countStoreUsage(zone),
                ]);
                if (geoZoneUsage > 0 || storeUsage > 0) {
                    const usage = [
                        storeUsage > 0 ? `${plural(storeUsage, "store")} (Region / State)` : "",
                        geoZoneUsage > 0 ? plural(geoZoneUsage, "geo zone location") : "",
                    ]
                        .filter(Boolean)
                        .join(", ");
                    res.status(409).json({
                        message: `${zone.name} is used by ${usage}. Change or remove them first.`,
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
