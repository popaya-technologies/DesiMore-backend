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
exports.VoucherThemeController = void 0;
const data_source_1 = require("../data-source");
const voucher_theme_entity_1 = require("../entities/voucher_theme.entity");
const voucher_theme_dto_1 = require("../dto/voucher_theme.dto");
const class_validator_1 = require("class-validator");
const voucherThemeRepository = data_source_1.AppDataSource.getRepository(voucher_theme_entity_1.VoucherTheme);
exports.VoucherThemeController = {
    createVoucherTheme: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const voucherThemeData = new voucher_theme_dto_1.CreateVoucherThemeDto();
            Object.assign(voucherThemeData, req.body);
            const errors = yield (0, class_validator_1.validate)(voucherThemeData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const voucherTheme = voucherThemeRepository.create({
                name: voucherThemeData.name.trim(),
                image: voucherThemeData.image.trim(),
            });
            yield voucherThemeRepository.save(voucherTheme);
            res.status(201).json(voucherTheme);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getVoucherThemes: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, page = "1", limit = "10" } = req.query;
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (currentPage - 1) * take;
            const query = voucherThemeRepository.createQueryBuilder("voucherTheme");
            if (search && String(search).trim()) {
                query.andWhere("voucherTheme.name ILIKE :search", {
                    search: `%${String(search).trim()}%`,
                });
            }
            query.orderBy("voucherTheme.createdAt", "DESC");
            const [voucherThemes, total] = yield query
                .skip(skip)
                .take(take)
                .getManyAndCount();
            res.status(200).json({
                data: voucherThemes,
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
    getVoucherThemeById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const voucherTheme = yield voucherThemeRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!voucherTheme) {
                res.status(404).json({
                    message: "Voucher theme not found",
                });
                return;
            }
            res.status(200).json(voucherTheme);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    updateVoucherTheme: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const voucherTheme = yield voucherThemeRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!voucherTheme) {
                res.status(404).json({
                    message: "Voucher theme not found",
                });
                return;
            }
            const updateData = new voucher_theme_dto_1.UpdateVoucherThemeDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.name !== undefined) {
                voucherTheme.name = updateData.name.trim();
            }
            if (updateData.image !== undefined) {
                voucherTheme.image = updateData.image.trim();
            }
            yield voucherThemeRepository.save(voucherTheme);
            res.status(200).json(voucherTheme);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    deleteVoucherTheme: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const voucherTheme = yield voucherThemeRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!voucherTheme) {
                res.status(404).json({
                    message: "Voucher theme not found",
                });
                return;
            }
            yield voucherThemeRepository.remove(voucherTheme);
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
