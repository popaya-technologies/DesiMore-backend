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
        try {
            const brandData = new brand_dto_1.CreateBrandDto();
            Object.assign(brandData, req.body);
            const errors = yield (0, class_validator_1.validate)(brandData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const brand = brandRepository.create(brandData);
            yield brandRepository.save(brand);
            res.status(201).json(brand);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getBrands: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const brands = yield brandRepository.find();
            res.status(200).json(brands);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getBrandById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const brand = yield brandRepository.findOne({
                where: { id: req.params.id },
            });
            if (!brand) {
                res.status(404).json({ message: "Brand not found" });
                return;
            }
            res.status(200).json(brand);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    updateBrand: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const brand = yield brandRepository.findOne({
                where: { id: req.params.id },
            });
            if (!brand) {
                res.status(404).json({ message: "Brand not found" });
                return;
            }
            const updateData = new brand_dto_1.UpdateBrandDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            Object.assign(brand, updateData);
            yield brandRepository.save(brand);
            res.status(200).json(brand);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    deleteBrand: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const brand = yield brandRepository.findOne({
                where: { id: req.params.id },
            });
            if (!brand) {
                res.status(404).json({ message: "Brand not found" });
                return;
            }
            yield brandRepository.remove(brand);
            res.status(204).send();
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
