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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadController = exports.DOWNLOAD_DIR = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const data_source_1 = require("../data-source");
const download_entity_1 = require("../entities/download.entity");
const product_entity_1 = require("../entities/product.entity");
const order_entity_1 = require("../entities/order.entity");
const product_dto_1 = require("../dto/product.dto");
const product_service_1 = require("../services/product.service");
const api_error_1 = require("../utils/api-error");
exports.DOWNLOAD_DIR = path_1.default.resolve(process.cwd(), process.env.DOWNLOAD_DIR || "private-downloads");
exports.DownloadController = {
    list: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.json(yield data_source_1.AppDataSource.getRepository(download_entity_1.Download).find({
                order: { name: "ASC" },
            }));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    create: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = (0, class_transformer_1.plainToInstance)(product_dto_1.DownloadDto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto, {
                whitelist: true,
                forbidNonWhitelisted: true,
                validationError: { target: false, value: false },
            });
            if (errors.length)
                throw new api_error_1.ApiError(400, "Invalid download", errors);
            (0, product_service_1.validateAssetUrl)(dto.url);
            res
                .status(201)
                .json(yield data_source_1.AppDataSource.getRepository(download_entity_1.Download).save(data_source_1.AppDataSource.getRepository(download_entity_1.Download).create(dto)));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    upload: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const file = req.file;
        try {
            if (!file)
                throw new api_error_1.ApiError(400, "File is required");
            const name = String(req.body.name || file.originalname).trim();
            if (!name || name.length > 255)
                throw new api_error_1.ApiError(400, "Name must contain 1 to 255 characters");
            const repo = data_source_1.AppDataSource.getRepository(download_entity_1.Download);
            const record = repo.create({ name, url: "", storagePath: file.filename });
            yield repo.save(record);
            record.url = "/api/downloads/" + record.id + "/content";
            yield repo.save(record);
            const { storagePath } = record, response = __rest(record, ["storagePath"]);
            res.status(201).json(response);
        }
        catch (error) {
            if (file)
                yield fs_1.default.promises.unlink(file.path).catch(() => { });
            (0, api_error_1.respondError)(res, error);
        }
    }),
    content: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const download = yield data_source_1.AppDataSource.getRepository(download_entity_1.Download)
                .createQueryBuilder("download")
                .addSelect("download.storagePath")
                .where("download.id = :id", { id: req.params.id })
                .getOne();
            if (!download)
                throw new api_error_1.ApiError(404, "Download not found");
            const admin = req.user.userRole === "su" ||
                ((_a = req.user.permissions) === null || _a === void 0 ? void 0 : _a.some((p) => p.resource === "product" && ["create", "update"].includes(p.action)));
            if (!admin) {
                const purchased = yield data_source_1.AppDataSource.getRepository(order_entity_1.Order)
                    .createQueryBuilder("order")
                    .innerJoin("order.items", "item")
                    .innerJoin(product_entity_1.Product, "product", "product.id = item.productId")
                    .innerJoin("product.downloads", "download", "download.id = :id", {
                    id: download.id,
                })
                    .where("order.userId = :userId AND order.paymentStatus = :status", {
                    userId: req.user.id,
                    status: order_entity_1.PaymentStatus.COMPLETED,
                })
                    .getCount();
                if (!purchased)
                    throw new api_error_1.ApiError(403, "A paid purchase is required");
            }
            if (!download.storagePath) {
                res.redirect(download.url);
                return;
            }
            res.download(path_1.default.join(exports.DOWNLOAD_DIR, path_1.default.basename(download.storagePath)), download.name, { dotfiles: "allow" }, (error) => {
                if (error && !res.headersSent)
                    res.status(404).json({ message: "File not found" });
            });
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    remove: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const result = yield data_source_1.AppDataSource.getRepository(download_entity_1.Download).delete(req.params.id);
            if (!result.affected)
                throw new api_error_1.ApiError(404, "Download not found");
            // Keep physical files for recovery; they are never publicly served.
            res.status(204).send();
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
