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
exports.CountryController = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const country_dto_1 = require("../dto/country.dto");
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
const normalizeIso = (value) => (value === null || value === void 0 ? void 0 : value.trim().toUpperCase()) || null;
// Stores keep their country as free text, so a country matches by name or ISO code.
const countryMatchValues = (country) => [country.name, country.isoCode2, country.isoCode3]
    .filter((value) => Boolean(value))
    .map((value) => value.trim().toLowerCase());
// The default country is the country of the main (first created) store, like the
// store settings country of the old site.
const getDefaultStoreCountry = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const [store] = yield data_source_1.AppDataSource.getRepository(store_entity_1.Store).find({
        select: ["id", "country"],
        order: { createdAt: "ASC" },
        take: 1,
    });
    return ((_a = store === null || store === void 0 ? void 0 : store.country) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || null;
});
const withIsDefault = (countries, defaultCountry) => countries.map((country) => (Object.assign(Object.assign({}, country), { isDefault: defaultCountry !== null &&
        countryMatchValues(country).includes(defaultCountry) })));
// Returns a message when name or an ISO code is already used by another country.
const findConflict = (values, excludeId) => __awaiter(void 0, void 0, void 0, function* () {
    const repository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
    const checks = [
        ["Country already exists", "LOWER(country.name) = LOWER(:value)", values.name],
        ["ISO Code (2) is already used by another country", "UPPER(country.isoCode2) = :value", values.isoCode2],
        ["ISO Code (3) is already used by another country", "UPPER(country.isoCode3) = :value", values.isoCode3],
    ];
    for (const [message, condition, value] of checks) {
        if (!value)
            continue;
        const query = repository
            .createQueryBuilder("country")
            .select(["country.id"])
            .where(condition, { value });
        if (excludeId) {
            query.andWhere("country.id != :excludeId", { excludeId });
        }
        if (yield query.getOne()) {
            return message;
        }
    }
    return null;
});
class CountryController {
    static createCountry(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const repository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const dto = (0, class_transformer_1.plainToInstance)(country_dto_1.CreateCountryDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
                const name = dto.name.trim();
                const isoCode2 = normalizeIso(dto.isoCode2);
                const isoCode3 = normalizeIso(dto.isoCode3);
                const conflict = yield findConflict({ name, isoCode2, isoCode3 });
                if (conflict) {
                    res.status(409).json({
                        message: conflict,
                    });
                    return;
                }
                const country = repository.create({
                    name,
                    isoCode2,
                    isoCode3,
                    addressFormat: ((_a = dto.addressFormat) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                    postcodeRequired: dto.postcodeRequired,
                    status: dto.status,
                });
                const savedCountry = yield repository.save(country);
                res.status(201).json(savedCountry);
            }
            catch (error) {
                console.error("Create country error:", error);
                res.status(500).json({
                    message: "Failed to create country",
                });
            }
        });
    }
    static getCountries(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const status = typeof req.query.status === "string"
                    ? req.query.status.trim().toLowerCase()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
                // Column sorting from the admin list; anything else falls back to name A-Z.
                const sortColumns = {
                    name: "country.name",
                    isoCode2: "country.isoCode2",
                    isoCode3: "country.isoCode3",
                };
                const sortBy = typeof req.query.sortBy === "string" &&
                    sortColumns[req.query.sortBy]
                    ? sortColumns[req.query.sortBy]
                    : sortColumns.name;
                const sortOrder = String(req.query.sortOrder).toUpperCase() === "DESC"
                    ? "DESC"
                    : "ASC";
                const queryBuilder = repository
                    .createQueryBuilder("country")
                    .orderBy(sortBy, sortOrder, "NULLS LAST")
                    .addOrderBy("country.name", "ASC");
                if (search) {
                    queryBuilder.andWhere(`(
            country.name ILIKE :search
            OR country.isoCode2 ILIKE :search
            OR country.isoCode3 ILIKE :search
          )`, {
                        search: `%${search}%`,
                    });
                }
                if (status === "enabled" || status === "true") {
                    queryBuilder.andWhere("country.status = :status", { status: true });
                }
                else if (status === "disabled" || status === "false") {
                    queryBuilder.andWhere("country.status = :status", { status: false });
                }
                const [[data, total], defaultCountry] = yield Promise.all([
                    queryBuilder
                        .skip((page - 1) * limit)
                        .take(limit)
                        .getManyAndCount(),
                    getDefaultStoreCountry(),
                ]);
                res.json({
                    data: withIsDefault(data, defaultCountry),
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Get countries error:", error);
                res.status(500).json({
                    message: "Failed to get countries",
                });
            }
        });
    }
    // Storefront: enabled countries only, for address and checkout dropdowns.
    static getEnabledCountries(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [countries, defaultCountry] = yield Promise.all([
                    data_source_1.AppDataSource.getRepository(country_entity_1.Country).find({
                        where: { status: true },
                        select: [
                            "id",
                            "name",
                            "isoCode2",
                            "isoCode3",
                            "addressFormat",
                            "postcodeRequired",
                        ],
                        order: { name: "ASC" },
                    }),
                    getDefaultStoreCountry(),
                ]);
                res.json({ data: withIsDefault(countries, defaultCountry) });
            }
            catch (error) {
                console.error("Get enabled countries error:", error);
                res.status(500).json({
                    message: "Failed to get countries",
                });
            }
        });
    }
    static getCountryById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const country = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!country) {
                    res.status(404).json({
                        message: "Country not found",
                    });
                    return;
                }
                res.json(country);
            }
            catch (error) {
                console.error("Get country by id error:", error);
                res.status(500).json({
                    message: "Failed to get country",
                });
            }
        });
    }
    static updateCountry(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const repository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const country = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!country) {
                    res.status(404).json({
                        message: "Country not found",
                    });
                    return;
                }
                const dto = (0, class_transformer_1.plainToInstance)(country_dto_1.UpdateCountryDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
                const name = (_a = dto.name) === null || _a === void 0 ? void 0 : _a.trim();
                const isoCode2 = dto.isoCode2 !== undefined ? normalizeIso(dto.isoCode2) : undefined;
                const isoCode3 = dto.isoCode3 !== undefined ? normalizeIso(dto.isoCode3) : undefined;
                const conflict = yield findConflict({ name, isoCode2, isoCode3 }, country.id);
                if (conflict) {
                    res.status(409).json({
                        message: conflict,
                    });
                    return;
                }
                if (name !== undefined) {
                    country.name = name;
                }
                if (isoCode2 !== undefined) {
                    country.isoCode2 = isoCode2;
                }
                if (isoCode3 !== undefined) {
                    country.isoCode3 = isoCode3;
                }
                if (dto.addressFormat !== undefined) {
                    country.addressFormat =
                        dto.addressFormat.trim() || null;
                }
                if (dto.postcodeRequired !== undefined) {
                    country.postcodeRequired =
                        dto.postcodeRequired;
                }
                if (dto.status !== undefined) {
                    country.status = dto.status;
                }
                const updatedCountry = yield repository.save(country);
                res.json(updatedCountry);
            }
            catch (error) {
                console.error("Update country error:", error);
                res.status(500).json({
                    message: "Failed to update country",
                });
            }
        });
    }
    static deleteCountry(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const country = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!country) {
                    res.status(404).json({
                        message: "Country not found",
                    });
                    return;
                }
                const storeCountryValues = countryMatchValues(country);
                const [zoneCount, geoZoneCount, storeCount] = yield Promise.all([
                    data_source_1.AppDataSource.getRepository(zone_entity_1.Zone).count({
                        where: { countryId: country.id },
                    }),
                    data_source_1.AppDataSource.getRepository(geo_zone_location_entity_1.GeoZoneLocation).count({
                        where: { countryId: country.id },
                    }),
                    data_source_1.AppDataSource.getRepository(store_entity_1.Store)
                        .createQueryBuilder("store")
                        .where("LOWER(TRIM(store.country)) IN (:...values)", {
                        values: storeCountryValues,
                    })
                        .getCount(),
                ]);
                if (zoneCount > 0 || geoZoneCount > 0 || storeCount > 0) {
                    const usage = [
                        storeCount > 0 ? `${storeCount} store${storeCount === 1 ? "" : "s"}` : "",
                        zoneCount > 0 ? `${zoneCount} zone${zoneCount === 1 ? "" : "s"}` : "",
                        geoZoneCount > 0
                            ? `${geoZoneCount} geo zone location${geoZoneCount === 1 ? "" : "s"}`
                            : "",
                    ]
                        .filter(Boolean)
                        .join(", ");
                    res.status(409).json({
                        message: `${country.name} is used by ${usage}. Change or remove them first.`,
                    });
                    return;
                }
                yield repository.remove(country);
                res.json({
                    message: "Country deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete country error:", error);
                res.status(500).json({
                    message: "Failed to delete country",
                });
            }
        });
    }
}
exports.CountryController = CountryController;
