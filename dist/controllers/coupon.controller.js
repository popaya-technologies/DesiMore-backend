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
exports.CouponController = void 0;
const data_source_1 = require("../data-source");
const coupon_entity_1 = require("../entities/coupon.entity");
const coupon_dto_1 = require("../dto/coupon.dto");
const class_validator_1 = require("class-validator");
const couponRepository = data_source_1.AppDataSource.getRepository(coupon_entity_1.Coupon);
exports.CouponController = {
    createCoupon: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            const couponData = new coupon_dto_1.CreateCouponDto();
            Object.assign(couponData, req.body);
            const errors = yield (0, class_validator_1.validate)(couponData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const coupon = couponRepository.create({
                name: couponData.name.trim(),
                code: couponData.code.trim(),
                type: ((_a = couponData.type) === null || _a === void 0 ? void 0 : _a.trim()) || "Percentage",
                discount: (_b = couponData.discount) !== null && _b !== void 0 ? _b : 0,
                totalAmount: (_c = couponData.totalAmount) !== null && _c !== void 0 ? _c : 0,
                customerLogin: (_d = couponData.customerLogin) !== null && _d !== void 0 ? _d : false,
                freeShipping: (_e = couponData.freeShipping) !== null && _e !== void 0 ? _e : false,
                dateStart: couponData.dateStart,
                dateEnd: couponData.dateEnd,
                usesPerCoupon: (_f = couponData.usesPerCoupon) !== null && _f !== void 0 ? _f : 1,
                usesPerCustomer: (_g = couponData.usesPerCustomer) !== null && _g !== void 0 ? _g : 1,
                isActive: (_h = couponData.isActive) !== null && _h !== void 0 ? _h : true,
            });
            yield couponRepository.save(coupon);
            res.status(201).json(coupon);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getCoupons: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (currentPage - 1) * take;
            const query = couponRepository.createQueryBuilder("coupon");
            if (search && String(search).trim()) {
                const searchValue = `%${String(search).trim()}%`;
                query.andWhere(`(
            coupon.name ILIKE :search
            OR coupon.code ILIKE :search
          )`, {
                    search: searchValue,
                });
            }
            query
                .orderBy("coupon.createdAt", "DESC");
            const [coupons, total] = yield query
                .skip(skip)
                .take(take)
                .getManyAndCount();
            res.status(200).json({
                data: coupons,
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
    getCouponById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const coupon = yield couponRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!coupon) {
                res.status(404).json({
                    message: "Coupon not found",
                });
                return;
            }
            res.status(200).json(coupon);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    updateCoupon: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const coupon = yield couponRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!coupon) {
                res.status(404).json({
                    message: "Coupon not found",
                });
                return;
            }
            const updateData = new coupon_dto_1.UpdateCouponDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.name !== undefined) {
                coupon.name = updateData.name.trim();
            }
            if (updateData.code !== undefined) {
                coupon.code = updateData.code.trim();
            }
            if (updateData.type !== undefined) {
                coupon.type = updateData.type.trim();
            }
            if (updateData.discount !== undefined) {
                coupon.discount = updateData.discount;
            }
            if (updateData.totalAmount !== undefined) {
                coupon.totalAmount = updateData.totalAmount;
            }
            if (updateData.customerLogin !== undefined) {
                coupon.customerLogin = updateData.customerLogin;
            }
            if (updateData.freeShipping !== undefined) {
                coupon.freeShipping = updateData.freeShipping;
            }
            if (updateData.dateStart !== undefined) {
                coupon.dateStart = updateData.dateStart;
            }
            if (updateData.dateEnd !== undefined) {
                coupon.dateEnd = updateData.dateEnd;
            }
            if (updateData.usesPerCoupon !== undefined) {
                coupon.usesPerCoupon =
                    updateData.usesPerCoupon;
            }
            if (updateData.usesPerCustomer !== undefined) {
                coupon.usesPerCustomer =
                    updateData.usesPerCustomer;
            }
            if (updateData.isActive !== undefined) {
                coupon.isActive = updateData.isActive;
            }
            yield couponRepository.save(coupon);
            res.status(200).json(coupon);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    deleteCoupon: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const coupon = yield couponRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!coupon) {
                res.status(404).json({
                    message: "Coupon not found",
                });
                return;
            }
            yield couponRepository.remove(coupon);
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
