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
exports.CurrencyController = exports.isDefaultCurrency = exports.getDefaultStoreCurrency = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const currency_entity_1 = require("../entities/currency.entity");
const store_entity_1 = require("../entities/store.entity");
const currency_dto_1 = require("../dto/currency.dto");
// The default currency is the main (first created) store's Currency setting, which is
// free text, so it matches a currency by title or code (e.g. "US Dollar" or "USD").
const getDefaultStoreCurrency = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const [store] = yield data_source_1.AppDataSource.getRepository(store_entity_1.Store).find({
        select: ["id", "currency"],
        order: { createdAt: "ASC" },
        take: 1,
    });
    return ((_a = store === null || store === void 0 ? void 0 : store.currency) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || null;
});
exports.getDefaultStoreCurrency = getDefaultStoreCurrency;
const isDefaultCurrency = (currency, defaultCurrency) => defaultCurrency !== null &&
    [currency.currencyTitle, currency.code]
        .map((value) => value === null || value === void 0 ? void 0 : value.trim().toLowerCase())
        .includes(defaultCurrency);
exports.isDefaultCurrency = isDefaultCurrency;
const validationErrors = (dto) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
    });
    return errors.flatMap((error) => { var _a; return Object.values((_a = error.constraints) !== null && _a !== void 0 ? _a : {}); });
});
// Returns a message when the title or code is already used by another currency
// (case-insensitive), otherwise null.
const findConflict = (values, excludeId) => __awaiter(void 0, void 0, void 0, function* () {
    const checks = [
        ["A currency with this title already exists", "LOWER(currency.currencyTitle) = LOWER(:value)", values.currencyTitle],
        ["A currency with this code already exists", "UPPER(currency.code) = :value", values.code],
    ];
    for (const [message, condition, value] of checks) {
        if (!value)
            continue;
        const query = data_source_1.AppDataSource.getRepository(currency_entity_1.Currency)
            .createQueryBuilder("currency")
            .select(["currency.id"])
            .where(condition, { value });
        if (excludeId)
            query.andWhere("currency.id != :excludeId", { excludeId });
        if (yield query.getOne())
            return message;
    }
    return null;
});
// Like OpenCart: the default currency is the base for all values, so its value is 1
// and it must stay enabled.
const defaultCurrencyRuleError = (currency) => {
    if (Number(currency.value) !== 1)
        return `${currency.currencyTitle} is the store's default currency, so its value must be 1`;
    if (!currency.status)
        return `${currency.currencyTitle} is the store's default currency and cannot be disabled`;
    return null;
};
class CurrencyController {
    static repository() {
        return data_source_1.AppDataSource.getRepository(currency_entity_1.Currency);
    }
    static buildResponse(currency, defaultCurrency = null) {
        return {
            id: currency.id,
            currencyTitle: currency.currencyTitle,
            code: currency.code,
            symbolLeft: currency.symbolLeft,
            symbolRight: currency.symbolRight,
            decimalPlaces: currency.decimalPlaces,
            value: Number(currency.value),
            status: currency.status,
            isDefault: (0, exports.isDefaultCurrency)(currency, defaultCurrency),
            createdAt: currency.createdAt,
            updatedAt: currency.updatedAt,
        };
    }
    static createCurrency(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const dto = (0, class_transformer_1.plainToInstance)(currency_dto_1.CreateCurrencyDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length > 0) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
                const repository = CurrencyController.repository();
                const currencyTitle = dto.currencyTitle.trim();
                const code = dto.code.trim().toUpperCase();
                const conflict = yield findConflict({ currencyTitle, code });
                if (conflict) {
                    res.status(409).json({
                        message: conflict,
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
                const defaultCurrency = yield (0, exports.getDefaultStoreCurrency)();
                const ruleError = (0, exports.isDefaultCurrency)(currency, defaultCurrency) &&
                    defaultCurrencyRuleError(currency);
                if (ruleError) {
                    res.status(400).json({
                        message: ruleError,
                    });
                    return;
                }
                const savedCurrency = yield repository.save(currency);
                res.status(201).json(CurrencyController.buildResponse(savedCurrency, defaultCurrency));
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
                const status = typeof req.query.status === "string"
                    ? req.query.status.trim().toLowerCase()
                    : "";
                // Column sorting from the admin list; default is title A-Z.
                const sortColumns = {
                    currencyTitle: "currency.currencyTitle",
                    code: "currency.code",
                    value: "currency.value",
                    updatedAt: "currency.updatedAt",
                };
                const sortBy = typeof req.query.sortBy === "string" &&
                    sortColumns[req.query.sortBy]
                    ? sortColumns[req.query.sortBy]
                    : sortColumns.currencyTitle;
                const sortOrder = String(req.query.sortOrder).toUpperCase() === "DESC"
                    ? "DESC"
                    : "ASC";
                const queryBuilder = repository
                    .createQueryBuilder("currency")
                    .orderBy(sortBy, sortOrder)
                    .addOrderBy("currency.currencyTitle", "ASC")
                    .skip(skip)
                    .take(limit);
                if (search) {
                    queryBuilder.andWhere(`(
            currency.currencyTitle ILIKE :search
            OR currency.code ILIKE :search
          )`, {
                        search: `%${search}%`,
                    });
                }
                if (status === "enabled" || status === "true") {
                    queryBuilder.andWhere("currency.status = :status", { status: true });
                }
                else if (status === "disabled" || status === "false") {
                    queryBuilder.andWhere("currency.status = :status", { status: false });
                }
                const [[currencies, total], defaultCurrency] = yield Promise.all([
                    queryBuilder.getManyAndCount(),
                    (0, exports.getDefaultStoreCurrency)(),
                ]);
                res.status(200).json({
                    data: currencies.map((currency) => CurrencyController.buildResponse(currency, defaultCurrency)),
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
    // Storefront: the store's default currency, used to format every price. Prices are
    // stored in this currency, so no conversion is applied.
    static getDefaultCurrency(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const defaultCurrency = yield (0, exports.getDefaultStoreCurrency)();
                const currencies = yield CurrencyController.repository().find({
                    where: { status: true },
                });
                const currency = currencies.find((item) => (0, exports.isDefaultCurrency)(item, defaultCurrency));
                res.status(200).json({
                    data: currency
                        ? {
                            code: currency.code,
                            currencyTitle: currency.currencyTitle,
                            symbolLeft: (_a = currency.symbolLeft) !== null && _a !== void 0 ? _a : "",
                            symbolRight: (_b = currency.symbolRight) !== null && _b !== void 0 ? _b : "",
                            decimalPlaces: currency.decimalPlaces,
                        }
                        : null,
                });
            }
            catch (error) {
                console.error("Error getting default currency:", error);
                res.status(500).json({
                    message: "Failed to get default currency",
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
                res.status(200).json(CurrencyController.buildResponse(currency, yield (0, exports.getDefaultStoreCurrency)()));
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
                const dto = (0, class_transformer_1.plainToInstance)(currency_dto_1.UpdateCurrencyDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length > 0) {
                    res.status(400).json({
                        message: errors[0],
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
                const code = (_b = dto.code) === null || _b === void 0 ? void 0 : _b.trim().toUpperCase();
                const conflict = yield findConflict({ currencyTitle, code }, currency.id);
                if (conflict) {
                    res.status(409).json({
                        message: conflict,
                    });
                    return;
                }
                const defaultCurrency = yield (0, exports.getDefaultStoreCurrency)();
                const wasDefault = (0, exports.isDefaultCurrency)(currency, defaultCurrency);
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
                const isDefault = (0, exports.isDefaultCurrency)(currency, defaultCurrency);
                // Renaming the default currency would leave the store without one.
                if (wasDefault && !isDefault) {
                    res.status(409).json({
                        message: `${currency.currencyTitle} is the store's default currency. Change the store's Currency setting before changing its title and code.`,
                    });
                    return;
                }
                const ruleError = isDefault && defaultCurrencyRuleError(currency);
                if (ruleError) {
                    res.status(400).json({
                        message: ruleError,
                    });
                    return;
                }
                const updatedCurrency = yield repository.save(currency);
                res.status(200).json(CurrencyController.buildResponse(updatedCurrency, defaultCurrency));
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
                if ((0, exports.isDefaultCurrency)(currency, yield (0, exports.getDefaultStoreCurrency)())) {
                    res.status(409).json({
                        message: `${currency.currencyTitle} is the store's default currency and cannot be deleted. Change the store's Currency setting first.`,
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
