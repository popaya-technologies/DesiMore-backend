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
exports.TaxClassController = void 0;
const XLSX = __importStar(require("xlsx"));
const data_source_1 = require("../data-source");
const tax_class_entity_1 = require("../entities/tax-class.entity");
const tax_class_service_1 = require("../services/tax-class.service");
const tax_class_service_2 = require("../services/tax-class.service");
const api_error_1 = require("../utils/api-error");
const handle = (action) => (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield action(req, res);
    }
    catch (error) {
        (0, api_error_1.respondError)(res, error);
    }
});
exports.TaxClassController = {
    createRate: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () { res.status(201).json(yield (0, tax_class_service_1.createTaxRate)(req.body)); })),
    rates: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        if (Object.keys(req.query).length)
            throw new api_error_1.ApiError(400, "Tax rate dropdown does not accept query parameters");
        const data = yield data_source_1.AppDataSource.getRepository(tax_class_entity_1.TaxRate).find({ order: { name: "ASC", id: "ASC" }, take: 10001 });
        if (data.length > 10000)
            throw new api_error_1.ApiError(400, "Tax rate catalog exceeds dropdown limit");
        res.json({ data });
    })),
    bulk: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () { res.json(yield new tax_class_service_2.TaxClassService().removeMany(req.body)); })),
    create: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.status(201).json(yield new tax_class_service_2.TaxClassService().save(req.body));
    })),
    update: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.json(yield new tax_class_service_2.TaxClassService().save(req.body, String(req.params.id)));
    })),
    remove: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.json(yield new tax_class_service_2.TaxClassService().remove(String(req.params.id)));
    })),
    get: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const row = yield data_source_1.AppDataSource.getRepository(tax_class_entity_1.TaxClass).findOne({
            where: { id: String(req.params.id) }, relations: ["rules", "rules.taxRate"], order: { rules: { priority: "ASC", id: "ASC" } },
        });
        if (!row)
            throw new api_error_1.ApiError(404, "Tax class not found");
        res.json(row);
    })),
    list: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { qb, page, limit } = (0, tax_class_service_2.taxClassQuery)(req.query);
        const [data, total] = yield qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        res.json({
            data: data.map((row, index) => (Object.assign(Object.assign({}, row), { no: (page - 1) * limit + index + 1 }))),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    })),
    export: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const format = (_a = req.query.format) !== null && _a !== void 0 ? _a : "csv";
        if (!["csv", "xlsx"].includes(String(format)))
            throw new api_error_1.ApiError(400, "Export format must be csv or xlsx");
        const { qb } = (0, tax_class_service_2.taxClassQuery)(req.query);
        const groups = yield qb.take(10001).getMany();
        if (groups.length > 10000)
            throw new api_error_1.ApiError(400, "Narrow filters to export at most 10000 groups");
        const safe = (value) => /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
        const sheet = XLSX.utils.json_to_sheet(groups.map((g) => ({
            "Tax Class Title": safe(g.title),
        })), { header: ["Tax Class Title"] });
        res.attachment("tax-classes." + format);
        if (format === "csv")
            res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
        else {
            const book = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(book, sheet, "Tax Classes");
            res
                .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
        }
    })),
};
