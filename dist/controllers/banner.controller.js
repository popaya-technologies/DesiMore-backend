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
exports.BannerController = void 0;
const XLSX = __importStar(require("xlsx"));
const data_source_1 = require("../data-source");
const banner_entity_1 = require("../entities/banner.entity");
const banner_service_1 = require("../services/banner.service");
const api_error_1 = require("../utils/api-error");
const repository = () => data_source_1.AppDataSource.getRepository(banner_entity_1.Banner);
exports.BannerController = {
    create: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = yield (0, banner_service_1.validateBannerInput)(req.body, true);
            const saved = yield repository().save(repository().create(dto));
            res.status(201).json((0, banner_service_1.bannerResponse)(saved));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    list: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { qb, page, limit } = (0, banner_service_1.bannerQuery)(req.query);
            const [rows, total] = yield qb
                .skip((page - 1) * limit)
                .take(limit)
                .getManyAndCount();
            res.json({
                data: rows.map(banner_service_1.bannerResponse),
                meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            });
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    get: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const banner = yield repository().findOneBy({
                id: String(req.params.id),
            });
            if (!banner)
                throw new api_error_1.ApiError(404, "Banner not found");
            res.json((0, banner_service_1.bannerResponse)(banner));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    update: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = yield (0, banner_service_1.validateBannerInput)(req.body, false);
            // Update only supplied columns; slide replacement is one atomic JSONB write.
            const result = yield repository().update(String(req.params.id), dto);
            if (!result.affected)
                throw new api_error_1.ApiError(404, "Banner not found");
            const banner = yield repository().findOneBy({
                id: String(req.params.id),
            });
            if (!banner)
                throw new api_error_1.ApiError(404, "Banner not found");
            res.json((0, banner_service_1.bannerResponse)(banner));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    remove: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const result = yield repository().delete(String(req.params.id));
            if (!result.affected)
                throw new api_error_1.ApiError(404, "Banner not found");
            res.json({ message: "Banner deleted successfully" });
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    export: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const format = (_a = req.query.format) !== null && _a !== void 0 ? _a : "csv";
            if (!["csv", "xlsx"].includes(String(format)))
                throw new api_error_1.ApiError(400, "Export format must be csv or xlsx");
            const { qb } = (0, banner_service_1.bannerQuery)(req.query);
            const banners = yield qb.take(10001).getMany();
            if (banners.length > 10000)
                throw new api_error_1.ApiError(400, "Narrow filters to export at most 10000 banners");
            const rows = banners.map((b) => ({
                "Banner Name": /^[=+\-@\t\r\n]/.test(b.name) ? "'" + b.name : b.name,
                Slides: b.slides.length,
                Status: b.isActive ? "Enabled" : "Disabled",
                "Created At": b.createdAt.toISOString(),
            }));
            const sheet = XLSX.utils.json_to_sheet(rows, {
                header: ["Banner Name", "Slides", "Status", "Created At"],
            });
            res.attachment("banners." + format);
            if (format === "csv")
                res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
            else {
                const book = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(book, sheet, "Banners");
                res
                    .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
            }
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
