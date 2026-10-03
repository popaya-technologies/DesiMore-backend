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
exports.SystemLanguageController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const system_language_entity_1 = require("../entities/system-language.entity");
const system_language_dto_1 = require("../dto/system-language.dto");
class SystemLanguageController {
    static repository() {
        return data_source_1.AppDataSource.getRepository(system_language_entity_1.SystemLanguage);
    }
    static buildResponse(language) {
        return {
            id: language.id,
            languageName: language.languageName,
            code: language.code,
            locale: language.locale,
            sortOrder: language.sortOrder,
            status: language.status,
            createdAt: language.createdAt,
            updatedAt: language.updatedAt,
        };
    }
    static createSystemLanguage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const dto = Object.assign(new system_language_dto_1.CreateSystemLanguageDto(), req.body);
                const errors = yield (0, class_validator_1.validate)(dto);
                if (errors.length > 0) {
                    res.status(400).json({
                        message: "Validation failed",
                        errors,
                    });
                    return;
                }
                const repository = SystemLanguageController.repository();
                const languageName = dto.languageName.trim();
                const code = dto.code.trim();
                const locale = dto.locale.trim();
                const existingLanguage = yield repository.findOne({
                    where: [
                        { languageName },
                        { code },
                        { locale },
                    ],
                });
                if (existingLanguage) {
                    res.status(409).json({
                        message: "A language with the same name, code, or locale already exists",
                    });
                    return;
                }
                const language = repository.create({
                    languageName,
                    code,
                    locale,
                    sortOrder: (_a = dto.sortOrder) !== null && _a !== void 0 ? _a : 0,
                    status: (_b = dto.status) !== null && _b !== void 0 ? _b : true,
                });
                const savedLanguage = yield repository.save(language);
                res.status(201).json(SystemLanguageController.buildResponse(savedLanguage));
            }
            catch (error) {
                console.error("Error creating system language:", error);
                res.status(500).json({
                    message: "Failed to create system language",
                });
            }
        });
    }
    static getSystemLanguages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = SystemLanguageController.repository();
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
                const skip = (page - 1) * limit;
                const queryBuilder = repository
                    .createQueryBuilder("language")
                    .orderBy("language.sortOrder", "ASC")
                    .addOrderBy("language.createdAt", "DESC")
                    .skip(skip)
                    .take(limit);
                if (search) {
                    queryBuilder.where(`(
            language.languageName ILIKE :search
            OR language.code ILIKE :search
            OR language.locale ILIKE :search
          )`, {
                        search: `%${search}%`,
                    });
                }
                const [languages, total] = yield queryBuilder.getManyAndCount();
                res.status(200).json({
                    data: languages.map(SystemLanguageController.buildResponse),
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Error getting system languages:", error);
                res.status(500).json({
                    message: "Failed to get system languages",
                });
            }
        });
    }
    static getSystemLanguageById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = SystemLanguageController.repository();
                const language = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!language) {
                    res.status(404).json({
                        message: "System language not found",
                    });
                    return;
                }
                res.status(200).json(SystemLanguageController.buildResponse(language));
            }
            catch (error) {
                console.error("Error getting system language:", error);
                res.status(500).json({
                    message: "Failed to get system language",
                });
            }
        });
    }
    static updateSystemLanguage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const dto = Object.assign(new system_language_dto_1.UpdateSystemLanguageDto(), req.body);
                const errors = yield (0, class_validator_1.validate)(dto);
                if (errors.length > 0) {
                    res.status(400).json({
                        message: "Validation failed",
                        errors,
                    });
                    return;
                }
                const repository = SystemLanguageController.repository();
                const language = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!language) {
                    res.status(404).json({
                        message: "System language not found",
                    });
                    return;
                }
                const languageName = (_a = dto.languageName) === null || _a === void 0 ? void 0 : _a.trim();
                const code = (_b = dto.code) === null || _b === void 0 ? void 0 : _b.trim();
                const locale = (_c = dto.locale) === null || _c === void 0 ? void 0 : _c.trim();
                if (languageName !== undefined ||
                    code !== undefined ||
                    locale !== undefined) {
                    const duplicateQuery = repository
                        .createQueryBuilder("language")
                        .where("language.id != :id", {
                        id: language.id,
                    });
                    const conditions = [];
                    const parameters = {
                        id: language.id,
                    };
                    if (languageName !== undefined) {
                        conditions.push("language.languageName = :languageName");
                        parameters.languageName = languageName;
                    }
                    if (code !== undefined) {
                        conditions.push("language.code = :code");
                        parameters.code = code;
                    }
                    if (locale !== undefined) {
                        conditions.push("language.locale = :locale");
                        parameters.locale = locale;
                    }
                    duplicateQuery.andWhere(`(${conditions.join(" OR ")})`, parameters);
                    const duplicate = yield duplicateQuery.getOne();
                    if (duplicate) {
                        res.status(409).json({
                            message: "A language with the same name, code, or locale already exists",
                        });
                        return;
                    }
                }
                if (languageName !== undefined) {
                    language.languageName = languageName;
                }
                if (code !== undefined) {
                    language.code = code;
                }
                if (locale !== undefined) {
                    language.locale = locale;
                }
                if (dto.sortOrder !== undefined) {
                    language.sortOrder = dto.sortOrder;
                }
                if (dto.status !== undefined) {
                    language.status = dto.status;
                }
                const updatedLanguage = yield repository.save(language);
                res.status(200).json(SystemLanguageController.buildResponse(updatedLanguage));
            }
            catch (error) {
                console.error("Error updating system language:", error);
                res.status(500).json({
                    message: "Failed to update system language",
                });
            }
        });
    }
    static deleteSystemLanguage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = SystemLanguageController.repository();
                const language = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!language) {
                    res.status(404).json({
                        message: "System language not found",
                    });
                    return;
                }
                yield repository.remove(language);
                res.status(200).json({
                    message: "System language deleted successfully",
                });
            }
            catch (error) {
                console.error("Error deleting system language:", error);
                res.status(500).json({
                    message: "Failed to delete system language",
                });
            }
        });
    }
}
exports.SystemLanguageController = SystemLanguageController;
