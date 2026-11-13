"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.LanguageEditorController = void 0;
const XLSX = __importStar(require("xlsx"));
const data_source_1 = require("../data-source");
const language_translation_entity_1 = require("../entities/language-translation.entity");
const language_editor_service_1 = require("../services/language-editor.service");
const api_error_1 = require("../utils/api-error");
const system_language_entity_1 = require("../entities/system-language.entity");
const typeorm_1 = require("typeorm");
const repo = () => data_source_1.AppDataSource.getRepository(language_translation_entity_1.LanguageTranslation);
const handle = (action) => (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield action(req, res);
    }
    catch (error) {
        (0, api_error_1.respondError)(res, error);
    }
});
exports.LanguageEditorController = {
    publicTranslations: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        const allowedQuery = ["languageId", "store"];
        if (Object.keys(req.query).some(key => !allowedQuery.includes(key))) {
            throw new api_error_1.ApiError(400, "Unknown query parameter");
        }
        const languageId = String((_a = req.query.languageId) !== null && _a !== void 0 ? _a : "").trim();
        const store = String((_b = req.query.store) !== null && _b !== void 0 ? _b : "Default").trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(languageId)) {
            throw new api_error_1.ApiError(400, "A valid languageId is required");
        }
        if (!store || store.length > 100 || /[\u0000-\u001f\u007f]/.test(store)) {
            throw new api_error_1.ApiError(400, "Invalid store");
        }
        const languageRepo = data_source_1.AppDataSource.getRepository(system_language_entity_1.SystemLanguage);
        const selectedLanguage = yield languageRepo.findOne({
            where: { id: languageId, status: true },
        });
        if (!selectedLanguage)
            throw new api_error_1.ApiError(404, "Enabled language not found");
        const defaultLanguage = yield languageRepo.findOne({
            where: { isDefault: true, status: true },
        });
        const languageIds = [...new Set([
                defaultLanguage === null || defaultLanguage === void 0 ? void 0 : defaultLanguage.id,
                selectedLanguage.id,
            ].filter((id) => Boolean(id)))];
        const rows = yield repo().find({
            where: { store, languageId: (0, typeorm_1.In)(languageIds) },
            order: { route: "ASC", key: "ASC" },
        });
        const translations = {};
        const addRows = (id) => {
            if (!id)
                return;
            for (const row of rows.filter(item => item.languageId === id)) {
                const route = row.route.trim().replace(/^\.+|\.+$/g, "");
                const key = row.key.trim().replace(/^\.+|\.+$/g, "");
                if (route && key) {
                    // Admins may enter either `title` or the fully-qualified
                    // `about.title`. Avoid producing `about.about.title`.
                    const fullKey = key === route || key.startsWith(`${route}.`)
                        ? key
                        : `${route}.${key}`;
                    translations[fullKey] = row.value;
                }
            }
        };
        addRows(defaultLanguage === null || defaultLanguage === void 0 ? void 0 : defaultLanguage.id);
        addRows(selectedLanguage.id);
        res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        res.json({
            language: {
                id: selectedLanguage.id,
                name: selectedLanguage.languageName,
                code: selectedLanguage.code,
                locale: selectedLanguage.locale,
                isDefault: selectedLanguage.isDefault,
            },
            defaultLanguageId: (_c = defaultLanguage === null || defaultLanguage === void 0 ? void 0 : defaultLanguage.id) !== null && _c !== void 0 ? _c : null,
            translations,
        });
    })),
    create: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.status(201).json(yield new language_editor_service_1.LanguageEditorService().save(req.body));
    })),
    update: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.json(yield new language_editor_service_1.LanguageEditorService().save(req.body, String(req.params.id)));
    })),
    list: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { qb, page, limit } = (0, language_editor_service_1.translationQuery)(req.query);
        const [data, total] = yield qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    })),
    get: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const row = yield repo().findOne({
            where: { id: String(req.params.id) },
            relations: { systemLanguage: true },
        });
        if (!row)
            throw new api_error_1.ApiError(404, "Translation not found");
        res.json(row);
    })),
    remove: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield repo().delete(String(req.params.id));
        if (!result.affected)
            throw new api_error_1.ApiError(404, "Translation not found");
        res.json({ message: "Translation deleted successfully" });
    })),
    bulkDelete: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.json(yield new language_editor_service_1.LanguageEditorService().deleteMany(req.body));
    })),
    options: handle((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const [stores, languages] = yield Promise.all([
            repo().createQueryBuilder("t").select("t.store", "value").distinct(true).orderBy("t.store", "ASC").getRawMany(),
            data_source_1.AppDataSource.getRepository(system_language_entity_1.SystemLanguage).find({
                order: { sortOrder: "ASC", languageName: "ASC" },
            }),
        ]);
        res.json({ stores: [...new Set(["Default", ...stores.map(s => s.value)])],
            languages,
            defaults: {
                store: "Default",
                languageId: (_b = (_a = languages.find(language => language.isDefault)) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "",
            } });
    })),
    export: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const format = (_a = req.query.format) !== null && _a !== void 0 ? _a : "csv";
        if (!["csv", "xlsx"].includes(String(format)))
            throw new api_error_1.ApiError(400, "Export format must be csv or xlsx");
        const { qb } = (0, language_editor_service_1.translationQuery)(req.query);
        const translations = yield qb.take(10001).getMany();
        if (translations.length > 10000)
            throw new api_error_1.ApiError(400, "Narrow filters to export at most 10000 translations");
        const safe = (value) => /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
        const rows = translations.map(t => ({ Store: safe(t.store), Language: safe(t.language),
            Route: safe(t.route), Key: safe(t.key), Value: safe(t.value) }));
        const sheet = XLSX.utils.json_to_sheet(rows, { header: ["Store", "Language", "Route", "Key", "Value"] });
        res.attachment("language-translations." + format);
        if (format === "csv")
            res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
        else {
            const book = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(book, sheet, "Translations");
            res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
        }
    })),
};
