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
const store_entity_1 = require("../entities/store.entity");
const seo_url_entity_1 = require("../entities/seo-url.entity");
const language_translation_entity_1 = require("../entities/language-translation.entity");
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
            isDefault: language.isDefault,
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
                if (dto.isDefault && dto.status === false) {
                    res.status(400).json({
                        message: "The default language must be enabled",
                    });
                    return;
                }
                const existingLanguage = yield repository
                    .createQueryBuilder("language")
                    .where("LOWER(language.languageName) = LOWER(:languageName)", {
                    languageName,
                })
                    .orWhere("LOWER(language.code) = LOWER(:code)", { code })
                    .orWhere("LOWER(language.locale) = LOWER(:locale)", { locale })
                    .getOne();
                if (existingLanguage) {
                    res.status(409).json({
                        message: "A language with the same name, code, or locale already exists",
                    });
                    return;
                }
                const languageCount = yield repository.count();
                const shouldBeDefault = languageCount === 0 || dto.isDefault === true;
                const language = repository.create({
                    languageName,
                    code,
                    locale,
                    sortOrder: (_a = dto.sortOrder) !== null && _a !== void 0 ? _a : 0,
                    status: (_b = dto.status) !== null && _b !== void 0 ? _b : true,
                    isDefault: shouldBeDefault,
                });
                const savedLanguage = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    if (shouldBeDefault) {
                        yield manager
                            .getRepository(system_language_entity_1.SystemLanguage)
                            .createQueryBuilder()
                            .update(system_language_entity_1.SystemLanguage)
                            .set({ isDefault: false })
                            .execute();
                    }
                    return manager.getRepository(system_language_entity_1.SystemLanguage).save(language);
                }));
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
    static getEnabledLanguages(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const languages = yield SystemLanguageController.repository().find({
                    where: { status: true },
                    order: {
                        sortOrder: "ASC",
                        languageName: "ASC",
                    },
                });
                res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
                res.status(200).json(languages.map((language) => ({
                    id: language.id,
                    name: language.languageName,
                    code: language.code,
                    locale: language.locale,
                    isDefault: language.isDefault,
                })));
            }
            catch (error) {
                console.error("Error getting enabled languages:", error);
                res.status(500).json({
                    message: "Failed to get enabled languages",
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
                const previousLanguageName = language.languageName;
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
                        conditions.push("LOWER(language.languageName) = LOWER(:languageName)");
                        parameters.languageName = languageName;
                    }
                    if (code !== undefined) {
                        conditions.push("LOWER(language.code) = LOWER(:code)");
                        parameters.code = code;
                    }
                    if (locale !== undefined) {
                        conditions.push("LOWER(language.locale) = LOWER(:locale)");
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
                    if (language.isDefault && !dto.status) {
                        res.status(400).json({
                            message: "The default language cannot be disabled",
                        });
                        return;
                    }
                    language.status = dto.status;
                }
                if (dto.isDefault === false && language.isDefault) {
                    res.status(400).json({
                        message: "Choose another default language before removing this default",
                    });
                    return;
                }
                if (dto.isDefault === true) {
                    language.isDefault = true;
                    language.status = true;
                }
                const updatedLanguage = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    if (dto.isDefault === true) {
                        yield manager
                            .getRepository(system_language_entity_1.SystemLanguage)
                            .createQueryBuilder()
                            .update(system_language_entity_1.SystemLanguage)
                            .set({ isDefault: false })
                            .where("id != :id", { id: language.id })
                            .execute();
                    }
                    const savedLanguage = yield manager.getRepository(system_language_entity_1.SystemLanguage).save(language);
                    if (savedLanguage.languageName !== previousLanguageName) {
                        yield manager.getRepository(store_entity_1.Store).update({ languageId: savedLanguage.id }, { language: savedLanguage.languageName });
                        yield manager.getRepository(seo_url_entity_1.SeoUrl).update({ languageId: savedLanguage.id }, { language: savedLanguage.languageName });
                        yield manager.getRepository(language_translation_entity_1.LanguageTranslation).update({ languageId: savedLanguage.id }, { language: savedLanguage.languageName });
                    }
                    return savedLanguage;
                }));
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
                if (language.isDefault) {
                    res.status(409).json({
                        message: "The default language cannot be deleted",
                    });
                    return;
                }
                const storesUsingLanguage = yield data_source_1.AppDataSource.getRepository(store_entity_1.Store).count({
                    where: { languageId: language.id },
                });
                if (storesUsingLanguage > 0) {
                    res.status(409).json({
                        message: `This language is assigned to ${storesUsingLanguage} store${storesUsingLanguage === 1 ? "" : "s"}`,
                    });
                    return;
                }
                const seoUrlsUsingLanguage = yield data_source_1.AppDataSource.getRepository(seo_url_entity_1.SeoUrl).count({
                    where: { languageId: language.id },
                });
                if (seoUrlsUsingLanguage > 0) {
                    res.status(409).json({
                        message: `This language is assigned to ${seoUrlsUsingLanguage} SEO URL${seoUrlsUsingLanguage === 1 ? "" : "s"}`,
                    });
                    return;
                }
                const translationsUsingLanguage = yield data_source_1.AppDataSource.getRepository(language_translation_entity_1.LanguageTranslation).count({
                    where: { languageId: language.id },
                });
                if (translationsUsingLanguage > 0) {
                    res.status(409).json({
                        message: `This language is assigned to ${translationsUsingLanguage} translation${translationsUsingLanguage === 1 ? "" : "s"}`,
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
