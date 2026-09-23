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
exports.BrandController = void 0;
const data_source_1 = require("../data-source");
const brand_entity_1 = require("../entities/brand.entity");
const brand_dto_1 = require("../dto/brand.dto");
const class_validator_1 = require("class-validator");
const brandRepository = data_source_1.AppDataSource.getRepository(brand_entity_1.Brand);
exports.BrandController = {
    createBrand: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const brandData = new brand_dto_1.CreateBrandDto();
            Object.assign(brandData, req.body);
            const errors = yield (0, class_validator_1.validate)(brandData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const existingName = yield brandRepository.findOne({
                where: {
                    name: brandData.name.trim(),
                },
            });
            if (existingName) {
                res.status(409).json({
                    message: "Brand name already exists",
                });
                return;
            }
            const existingKeyword = yield brandRepository.findOne({
                where: {
                    keyword: brandData.keyword,
                },
            });
            if (existingKeyword) {
                res.status(409).json({
                    message: "SEO keyword already exists",
                });
                return;
            }
            const brand = brandRepository.create({
                name: brandData.name.trim(),
                description: ((_a = brandData.description) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                image: brandData.image || null,
                sortOrder: brandData.sortOrder,
                keyword: brandData.keyword,
            });
            yield brandRepository.save(brand);
            res.status(201).json(brand);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getBrands: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const brands = yield brandRepository.find({
                order: {
                    sortOrder: "ASC",
                    createdAt: "DESC",
                },
            });
            res.status(200).json(brands);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getBrandById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const brand = yield brandRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!brand) {
                res.status(404).json({
                    message: "Brand not found",
                });
                return;
            }
            res.status(200).json(brand);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    updateBrand: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const brand = yield brandRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!brand) {
                res.status(404).json({
                    message: "Brand not found",
                });
                return;
            }
            const updateData = new brand_dto_1.UpdateBrandDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.name !== undefined) {
                const existingName = yield brandRepository.findOne({
                    where: {
                        name: updateData.name.trim(),
                    },
                });
                if (existingName && existingName.id !== brand.id) {
                    res.status(409).json({
                        message: "Brand name already exists",
                    });
                    return;
                }
                brand.name = updateData.name.trim();
            }
            if (updateData.description !== undefined) {
                brand.description = updateData.description.trim() || null;
            }
            if (updateData.image !== undefined) {
                brand.image = updateData.image || null;
            }
            if (updateData.sortOrder !== undefined) {
                brand.sortOrder = updateData.sortOrder;
            }
            if (updateData.keyword !== undefined) {
                const existingKeyword = yield brandRepository.findOne({
                    where: {
                        keyword: updateData.keyword,
                    },
                });
                if (existingKeyword && existingKeyword.id !== brand.id) {
                    res.status(409).json({
                        message: "SEO keyword already exists",
                    });
                    return;
                }
                brand.keyword = updateData.keyword;
            }
            yield brandRepository.save(brand);
            res.status(200).json(brand);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    deleteBrand: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const brand = yield brandRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!brand) {
                res.status(404).json({
                    message: "Brand not found",
                });
                return;
            }
            yield brandRepository.remove(brand);
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
