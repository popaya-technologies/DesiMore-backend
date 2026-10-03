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
const data_source_1 = require("../data-source");
const country_entity_1 = require("../entities/country.entity");
class CountryController {
    static createCountry(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const repository = data_source_1.AppDataSource.getRepository(country_entity_1.Country);
                const dto = req.body;
                const name = dto.name.trim();
                const existing = yield repository.findOne({
                    where: { name },
                });
                if (existing) {
                    res.status(409).json({
                        message: "Country already exists",
                    });
                    return;
                }
                const country = repository.create({
                    name,
                    isoCode2: ((_a = dto.isoCode2) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                    isoCode3: ((_b = dto.isoCode3) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                    addressFormat: ((_c = dto.addressFormat) === null || _c === void 0 ? void 0 : _c.trim()) || null,
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
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.max(Number(req.query.limit) || 10, 1);
                const queryBuilder = repository
                    .createQueryBuilder("country")
                    .orderBy("country.createdAt", "ASC");
                if (search) {
                    queryBuilder.andWhere(`(
            country.name ILIKE :search
            OR country.isoCode2 ILIKE :search
            OR country.isoCode3 ILIKE :search
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
                console.error("Get countries error:", error);
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
                const dto = req.body;
                if (dto.name !== undefined) {
                    const name = dto.name.trim();
                    const existing = yield repository.findOne({
                        where: { name },
                    });
                    if (existing &&
                        existing.id !== country.id) {
                        res.status(409).json({
                            message: "Country already exists",
                        });
                        return;
                    }
                    country.name = name;
                }
                if (dto.isoCode2 !== undefined) {
                    country.isoCode2 =
                        dto.isoCode2.trim() || null;
                }
                if (dto.isoCode3 !== undefined) {
                    country.isoCode3 =
                        dto.isoCode3.trim() || null;
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
