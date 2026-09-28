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
exports.GiftVoucherController = void 0;
const data_source_1 = require("../data-source");
const gift_voucher_entity_1 = require("../entities/gift_voucher.entity");
const gift_voucher_dto_1 = require("../dto/gift_voucher.dto");
const class_validator_1 = require("class-validator");
const giftVoucherRepository = data_source_1.AppDataSource.getRepository(gift_voucher_entity_1.GiftVoucher);
exports.GiftVoucherController = {
    // Create Gift Voucher
    createGiftVoucher: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const giftVoucherData = new gift_voucher_dto_1.CreateGiftVoucherDto();
            Object.assign(giftVoucherData, req.body);
            const errors = yield (0, class_validator_1.validate)(giftVoucherData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const giftVoucher = giftVoucherRepository.create({
                code: giftVoucherData.code.trim(),
                fromName: giftVoucherData.fromName.trim(),
                fromEmail: giftVoucherData.fromEmail.trim(),
                toName: giftVoucherData.toName.trim(),
                toEmail: giftVoucherData.toEmail.trim(),
                theme: ((_a = giftVoucherData.theme) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                message: ((_b = giftVoucherData.message) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                amount: (_c = giftVoucherData.amount) !== null && _c !== void 0 ? _c : 0,
                isActive: (_d = giftVoucherData.isActive) !== null && _d !== void 0 ? _d : true,
            });
            yield giftVoucherRepository.save(giftVoucher);
            res.status(201).json(giftVoucher);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Get Gift Vouchers
    getGiftVouchers: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, page = "1", limit = "10" } = req.query;
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (currentPage - 1) * take;
            const query = giftVoucherRepository.createQueryBuilder("giftVoucher");
            if (search && String(search).trim()) {
                const searchValue = `%${String(search).trim()}%`;
                query.andWhere(`(
            giftVoucher.code ILIKE :search
            OR giftVoucher.fromName ILIKE :search
            OR giftVoucher.toName ILIKE :search
            OR giftVoucher.fromEmail ILIKE :search
            OR giftVoucher.toEmail ILIKE :search
            OR giftVoucher.theme ILIKE :search
          )`, {
                    search: searchValue,
                });
            }
            query.orderBy("giftVoucher.createdAt", "DESC");
            const [giftVouchers, total] = yield query
                .skip(skip)
                .take(take)
                .getManyAndCount();
            res.status(200).json({
                data: giftVouchers,
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
    // Get Gift Voucher By ID
    getGiftVoucherById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const giftVoucher = yield giftVoucherRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!giftVoucher) {
                res.status(404).json({
                    message: "Gift voucher not found",
                });
                return;
            }
            res.status(200).json(giftVoucher);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Update Gift Voucher
    updateGiftVoucher: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const giftVoucher = yield giftVoucherRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!giftVoucher) {
                res.status(404).json({
                    message: "Gift voucher not found",
                });
                return;
            }
            const updateData = new gift_voucher_dto_1.UpdateGiftVoucherDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.code !== undefined) {
                giftVoucher.code = updateData.code.trim();
            }
            if (updateData.fromName !== undefined) {
                giftVoucher.fromName = updateData.fromName.trim();
            }
            if (updateData.fromEmail !== undefined) {
                giftVoucher.fromEmail = updateData.fromEmail.trim();
            }
            if (updateData.toName !== undefined) {
                giftVoucher.toName = updateData.toName.trim();
            }
            if (updateData.toEmail !== undefined) {
                giftVoucher.toEmail = updateData.toEmail.trim();
            }
            if (updateData.theme !== undefined) {
                giftVoucher.theme = updateData.theme.trim() || null;
            }
            if (updateData.message !== undefined) {
                giftVoucher.message = updateData.message.trim() || null;
            }
            if (updateData.amount !== undefined) {
                giftVoucher.amount = updateData.amount;
            }
            if (updateData.isActive !== undefined) {
                giftVoucher.isActive = updateData.isActive;
            }
            yield giftVoucherRepository.save(giftVoucher);
            res.status(200).json(giftVoucher);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Delete Gift Voucher
    deleteGiftVoucher: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const giftVoucher = yield giftVoucherRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!giftVoucher) {
                res.status(404).json({
                    message: "Gift voucher not found",
                });
                return;
            }
            yield giftVoucherRepository.remove(giftVoucher);
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
