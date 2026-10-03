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
exports.StoreLocationController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const store_location_entity_1 = require("../entities/store-location.entity");
const store_location_dto_1 = require("../dto/store-location.dto");
const storeLocationRepository = data_source_1.AppDataSource.getRepository(store_location_entity_1.StoreLocation);
const buildResponse = (storeLocation) => {
    return {
        id: storeLocation.id,
        storeName: storeLocation.storeName,
        address: storeLocation.address,
        geocode: storeLocation.geocode,
        telephone: storeLocation.telephone,
        fax: storeLocation.fax,
        image: storeLocation.image,
        openingTimes: storeLocation.openingTimes,
        comment: storeLocation.comment,
        createdAt: storeLocation.createdAt,
        updatedAt: storeLocation.updatedAt,
    };
};
exports.StoreLocationController = {
    // Create Store Location
    createStoreLocation: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            const storeLocationData = new store_location_dto_1.CreateStoreLocationDto();
            Object.assign(storeLocationData, req.body);
            const errors = yield (0, class_validator_1.validate)(storeLocationData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const storeLocation = storeLocationRepository.create({
                storeName: storeLocationData.storeName.trim(),
                address: storeLocationData.address.trim(),
                geocode: ((_a = storeLocationData.geocode) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                telephone: storeLocationData.telephone.trim(),
                fax: ((_b = storeLocationData.fax) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                image: ((_c = storeLocationData.image) === null || _c === void 0 ? void 0 : _c.trim()) || null,
                openingTimes: ((_d = storeLocationData.openingTimes) === null || _d === void 0 ? void 0 : _d.trim()) ||
                    null,
                comment: ((_e = storeLocationData.comment) === null || _e === void 0 ? void 0 : _e.trim()) ||
                    null,
            });
            yield storeLocationRepository.save(storeLocation);
            res
                .status(201)
                .json(buildResponse(storeLocation));
        }
        catch (error) {
            console.error("Create store location error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Get Store Locations
    getStoreLocations: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(String(page), 10) || 1, 1);
            const take = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);
            const skip = (currentPage - 1) * take;
            const query = storeLocationRepository.createQueryBuilder("storeLocation");
            if (search && String(search).trim()) {
                query.andWhere(`(
            storeLocation.storeName ILIKE :search
            OR storeLocation.address ILIKE :search
          )`, {
                    search: `%${String(search).trim()}%`,
                });
            }
            query
                .orderBy("storeLocation.createdAt", "DESC")
                .skip(skip)
                .take(take);
            const [storeLocations, total] = yield query.getManyAndCount();
            res.status(200).json({
                data: storeLocations.map(buildResponse),
                meta: {
                    total,
                    page: currentPage,
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error("Get store locations error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Get Store Location By ID
    getStoreLocationById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const storeLocation = yield storeLocationRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!storeLocation) {
                res.status(404).json({
                    message: "Store Location not found.",
                });
                return;
            }
            res.status(200).json(buildResponse(storeLocation));
        }
        catch (error) {
            console.error("Get store location error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Update Store Location
    updateStoreLocation: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const storeLocation = yield storeLocationRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!storeLocation) {
                res.status(404).json({
                    message: "Store Location not found.",
                });
                return;
            }
            const updateData = new store_location_dto_1.UpdateStoreLocationDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.storeName !== undefined) {
                storeLocation.storeName =
                    updateData.storeName.trim();
            }
            if (updateData.address !== undefined) {
                storeLocation.address =
                    updateData.address.trim();
            }
            if (updateData.geocode !== undefined) {
                storeLocation.geocode =
                    updateData.geocode.trim() || null;
            }
            if (updateData.telephone !== undefined) {
                storeLocation.telephone =
                    updateData.telephone.trim();
            }
            if (updateData.fax !== undefined) {
                storeLocation.fax =
                    updateData.fax.trim() || null;
            }
            if (updateData.image !== undefined) {
                storeLocation.image =
                    updateData.image.trim() || null;
            }
            if (updateData.openingTimes !== undefined) {
                storeLocation.openingTimes =
                    updateData.openingTimes.trim() || null;
            }
            if (updateData.comment !== undefined) {
                storeLocation.comment =
                    updateData.comment.trim() || null;
            }
            yield storeLocationRepository.save(storeLocation);
            res.status(200).json(buildResponse(storeLocation));
        }
        catch (error) {
            console.error("Update store location error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Delete Store Location
    deleteStoreLocation: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const storeLocation = yield storeLocationRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!storeLocation) {
                res.status(404).json({
                    message: "Store Location not found.",
                });
                return;
            }
            yield storeLocationRepository.remove(storeLocation);
            res.status(200).json({
                message: "Store Location deleted successfully.",
            });
        }
        catch (error) {
            console.error("Delete store location error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
};
