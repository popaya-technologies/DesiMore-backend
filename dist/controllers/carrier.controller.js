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
exports.CarrierController = void 0;
const data_source_1 = require("../data-source");
const carrier_entity_1 = require("../entities/carrier.entity");
const carrier_dto_1 = require("../dto/carrier.dto");
const class_validator_1 = require("class-validator");
const carrierRepository = data_source_1.AppDataSource.getRepository(carrier_entity_1.Carrier);
exports.CarrierController = {
    createCarrier: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            const carrierData = new carrier_dto_1.CreateCarrierDto();
            Object.assign(carrierData, req.body);
            const errors = yield (0, class_validator_1.validate)(carrierData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const carrier = carrierRepository.create({
                name: carrierData.name.trim(),
                trackingNoLength: (_a = carrierData.trackingNoLength) !== null && _a !== void 0 ? _a : 0,
                match: ((_b = carrierData.match) === null || _b === void 0 ? void 0 : _b.trim()) || "Exact",
                carrierUrl: ((_c = carrierData.carrierUrl) === null || _c === void 0 ? void 0 : _c.trim()) || null,
                sortOrder: (_d = carrierData.sortOrder) !== null && _d !== void 0 ? _d : 0,
                isActive: (_e = carrierData.isActive) !== null && _e !== void 0 ? _e : true,
            });
            yield carrierRepository.save(carrier);
            res.status(201).json(carrier);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getCarriers: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (currentPage - 1) * take;
            const query = carrierRepository.createQueryBuilder("carrier");
            if (search && String(search).trim()) {
                query.andWhere("carrier.name ILIKE :search", {
                    search: `%${String(search).trim()}%`,
                });
            }
            query
                .orderBy("carrier.sortOrder", "ASC")
                .addOrderBy("carrier.createdAt", "DESC");
            const [carriers, total] = yield query
                .skip(skip)
                .take(take)
                .getManyAndCount();
            res.status(200).json({
                data: carriers,
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
    getCarrierById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const carrier = yield carrierRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!carrier) {
                res.status(404).json({
                    message: "Carrier not found",
                });
                return;
            }
            res.status(200).json(carrier);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    updateCarrier: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const carrier = yield carrierRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!carrier) {
                res.status(404).json({
                    message: "Carrier not found",
                });
                return;
            }
            const updateData = new carrier_dto_1.UpdateCarrierDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.name !== undefined) {
                carrier.name = updateData.name.trim();
            }
            if (updateData.trackingNoLength !== undefined) {
                carrier.trackingNoLength = updateData.trackingNoLength;
            }
            if (updateData.match !== undefined) {
                carrier.match = updateData.match.trim();
            }
            if (updateData.carrierUrl !== undefined) {
                carrier.carrierUrl =
                    updateData.carrierUrl.trim() || null;
            }
            if (updateData.sortOrder !== undefined) {
                carrier.sortOrder = updateData.sortOrder;
            }
            if (updateData.isActive !== undefined) {
                carrier.isActive = updateData.isActive;
            }
            yield carrierRepository.save(carrier);
            res.status(200).json(carrier);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    deleteCarrier: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const carrier = yield carrierRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!carrier) {
                res.status(404).json({
                    message: "Carrier not found",
                });
                return;
            }
            yield carrierRepository.remove(carrier);
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
