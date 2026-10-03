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
exports.CurrencyController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const currency_entity_1 = require("../entities/currency.entity");
const currency_dto_1 = require("../dto/currency.dto");
class CurrencyController {
    static repository() {
        return data_source_1.AppDataSource.getRepository(currency_entity_1.Currency);
    }
    static buildResponse(currency) {
        return {
            id: currency.id,
            currencyTitle: currency.currencyTitle,
            code: currency.code,
            symbolLeft: currency.symbolLeft,
            symbolRight: currency.symbolRight,
            decimalPlaces: currency.decimalPlaces,
            value: Number(currency.value),
            status: currency.status,
            createdAt: currency.createdAt,
            updatedAt: currency.updatedAt,
        };
    }
    static createCurrency(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const dto = Object.assign(new currency_dto_1.CreateCurrencyDto(), req.body);
                const errors = yield (0, class_validator_1.validate)(dto);
                if (errors.length > 0) {
                    res.status(400).json({
                        message: "Validation failed",
                        errors,
                    });
                    return;
                }
                const repository = CurrencyController.repository();
                const currencyTitle = dto.currencyTitle.trim();
                const code = dto.code.trim();
                const existingCurrency = yield repository.findOne({
                    where: [
                        { currencyTitle },
                        { code },
                    ],
                });
                if (existingCurrency) {
                    res.status(409).json({
                        message: "A currency with the same title or code already exists",
                    });
                    return;
                }
                const currency = repository.create({
                    currencyTitle,
                    code,
                    symbolLeft: ((_a = dto.symbolLeft) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                    symbolRight: ((_b = dto.symbolRight) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                    decimalPlaces: (_c = dto.decimalPlaces) !== null && _c !== void 0 ? _c : 2,
                    value: (_d = dto.value) !== null && _d !== void 0 ? _d : 1,
                    status: (_e = dto.status) !== null && _e !== void 0 ? _e : true,
                });
                const savedCurrency = yield repository.save(currency);
                res.status(201).json(CurrencyController.buildResponse(savedCurrency));
            }
            catch (error) {
                console.error("Error creating currency:", error);
                res.status(500).json({
                    message: "Failed to create currency",
                });
            }
        });
    }
    static getCurrencies(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = CurrencyController.repository();
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
                const skip = (page - 1) * limit;
                const queryBuilder = repository
                    .createQueryBuilder("currency")
                    .orderBy("currency.currencyTitle", "ASC")
                    .addOrderBy("currency.createdAt", "DESC")
                    .skip(skip)
                    .take(limit);
                if (search) {
                    queryBuilder.where(`(
            currency.currencyTitle ILIKE :search
            OR currency.code ILIKE :search
          )`, {
                        search: `%${search}%`,
                    });
                }
                const [currencies, total] = yield queryBuilder.getManyAndCount();
                res.status(200).json({
                    data: currencies.map(CurrencyController.buildResponse),
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Error getting currencies:", error);
                res.status(500).json({
                    message: "Failed to get currencies",
                });
            }
        });
    }
    static getCurrencyById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = CurrencyController.repository();
                const currency = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!currency) {
                    res.status(404).json({
                        message: "Currency not found",
                    });
                    return;
                }
                res.status(200).json(CurrencyController.buildResponse(currency));
            }
            catch (error) {
                console.error("Error getting currency:", error);
                res.status(500).json({
                    message: "Failed to get currency",
                });
            }
        });
    }
    static updateCurrency(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const dto = Object.assign(new currency_dto_1.UpdateCurrencyDto(), req.body);
                const errors = yield (0, class_validator_1.validate)(dto);
                if (errors.length > 0) {
                    res.status(400).json({
                        message: "Validation failed",
                        errors,
                    });
                    return;
                }
                const repository = CurrencyController.repository();
                const currency = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!currency) {
                    res.status(404).json({
                        message: "Currency not found",
                    });
                    return;
                }
                const currencyTitle = (_a = dto.currencyTitle) === null || _a === void 0 ? void 0 : _a.trim();
                const code = (_b = dto.code) === null || _b === void 0 ? void 0 : _b.trim();
                if (currencyTitle !== undefined ||
                    code !== undefined) {
                    const duplicateQuery = repository
                        .createQueryBuilder("currency")
                        .where("currency.id != :id", {
                        id: currency.id,
                    });
                    const conditions = [];
                    const parameters = {
                        id: currency.id,
                    };
                    if (currencyTitle !== undefined) {
                        conditions.push("currency.currencyTitle = :currencyTitle");
                        parameters.currencyTitle =
                            currencyTitle;
                    }
                    if (code !== undefined) {
                        conditions.push("currency.code = :code");
                        parameters.code = code;
                    }
                    duplicateQuery.andWhere(`(${conditions.join(" OR ")})`, parameters);
                    const duplicate = yield duplicateQuery.getOne();
                    if (duplicate) {
                        res.status(409).json({
                            message: "A currency with the same title or code already exists",
                        });
                        return;
                    }
                }
                if (currencyTitle !== undefined) {
                    currency.currencyTitle = currencyTitle;
                }
                if (code !== undefined) {
                    currency.code = code;
                }
                if (dto.symbolLeft !== undefined) {
                    currency.symbolLeft =
                        dto.symbolLeft.trim() || null;
                }
                if (dto.symbolRight !== undefined) {
                    currency.symbolRight =
                        dto.symbolRight.trim() || null;
                }
                if (dto.decimalPlaces !== undefined) {
                    currency.decimalPlaces =
                        dto.decimalPlaces;
                }
                if (dto.value !== undefined) {
                    currency.value = dto.value;
                }
                if (dto.status !== undefined) {
                    currency.status = dto.status;
                }
                const updatedCurrency = yield repository.save(currency);
                res.status(200).json(CurrencyController.buildResponse(updatedCurrency));
            }
            catch (error) {
                console.error("Error updating currency:", error);
                res.status(500).json({
                    message: "Failed to update currency",
                });
            }
        });
    }
    static deleteCurrency(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = CurrencyController.repository();
                const currency = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!currency) {
                    res.status(404).json({
                        message: "Currency not found",
                    });
                    return;
                }
                yield repository.remove(currency);
                res.status(200).json({
                    message: "Currency deleted successfully",
                });
            }
            catch (error) {
                console.error("Error deleting currency:", error);
                res.status(500).json({
                    message: "Failed to delete currency",
                });
            }
        });
    }
}
exports.CurrencyController = CurrencyController;
