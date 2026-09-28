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
exports.SeoUrlController = void 0;
const data_source_1 = require("../data-source");
const seo_url_entity_1 = require("../entities/seo-url.entity");
const seo_url_dto_1 = require("../dto/seo-url.dto");
const class_validator_1 = require("class-validator");
const seoUrlRepository = data_source_1.AppDataSource.getRepository(seo_url_entity_1.SeoUrl);
exports.SeoUrlController = {
    createSeoUrl: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const seoUrlData = new seo_url_dto_1.CreateSeoUrlDto();
            Object.assign(seoUrlData, req.body);
            const errors = yield (0, class_validator_1.validate)(seoUrlData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const seoUrl = seoUrlRepository.create({
                query: seoUrlData.query.trim(),
                keyword: seoUrlData.keyword.trim(),
                store: (_a = seoUrlData.store) !== null && _a !== void 0 ? _a : "Default",
                language: (_b = seoUrlData.language) !== null && _b !== void 0 ? _b : "English",
            });
            yield seoUrlRepository.save(seoUrl);
            res.status(201).json(seoUrl);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getSeoUrls: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (currentPage - 1) * take;
            const query = seoUrlRepository.createQueryBuilder("seoUrl");
            if (search && String(search).trim()) {
                query.andWhere("(seoUrl.query ILIKE :search OR seoUrl.keyword ILIKE :search)", {
                    search: `%${String(search).trim()}%`,
                });
            }
            query.orderBy("seoUrl.createdAt", "DESC");
            const [seoUrls, total] = yield query
                .skip(skip)
                .take(take)
                .getManyAndCount();
            res.status(200).json({
                data: seoUrls,
                meta: {
                    total,
                    page: currentPage,
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getSeoUrlById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const seoUrl = yield seoUrlRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!seoUrl) {
                res.status(404).json({
                    message: "SEO URL not found",
                });
                return;
            }
            res.status(200).json(seoUrl);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    updateSeoUrl: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const seoUrl = yield seoUrlRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!seoUrl) {
                res.status(404).json({
                    message: "SEO URL not found",
                });
                return;
            }
            const updateData = new seo_url_dto_1.UpdateSeoUrlDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.query !== undefined) {
                seoUrl.query = updateData.query.trim();
            }
            if (updateData.keyword !== undefined) {
                seoUrl.keyword = updateData.keyword.trim();
            }
            if (updateData.store !== undefined) {
                seoUrl.store = updateData.store;
            }
            if (updateData.language !== undefined) {
                seoUrl.language = updateData.language;
            }
            yield seoUrlRepository.save(seoUrl);
            res.status(200).json(seoUrl);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    deleteSeoUrl: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const seoUrl = yield seoUrlRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!seoUrl) {
                res.status(404).json({
                    message: "SEO URL not found",
                });
                return;
            }
            yield seoUrlRepository.remove(seoUrl);
            res.status(204).send();
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
};
