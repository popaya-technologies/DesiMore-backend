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
exports.ReturnReasonController = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const return_usage_service_1 = require("../services/return-usage.service");
const return_reason_entity_1 = require("../entities/return-reason.entity");
const return_reason_dto_1 = require("../dto/return-reason.dto");
const validationErrors = (dto) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
    });
    return errors.flatMap((error) => { var _a; return Object.values((_a = error.constraints) !== null && _a !== void 0 ? _a : {}); });
});
// Names are unique regardless of upper/lower case.
const isNameTaken = (name, excludeId) => __awaiter(void 0, void 0, void 0, function* () {
    const query = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason)
        .createQueryBuilder("returnReason")
        .select(["returnReason.id"])
        .where("LOWER(returnReason.name) = LOWER(:name)", { name });
    if (excludeId)
        query.andWhere("returnReason.id != :excludeId", { excludeId });
    return Boolean(yield query.getOne());
});
class ReturnReasonController {
    static createReturnReason(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const dto = (0, class_transformer_1.plainToInstance)(return_reason_dto_1.CreateReturnReasonDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
                const name = dto.name.trim();
                if (yield isNameTaken(name)) {
                    res.status(409).json({
                        message: "Return reason already exists",
                    });
                    return;
                }
                const returnReason = repository.create({
                    name,
                });
                const savedReturnReason = yield repository.save(returnReason);
                res.status(201).json(savedReturnReason);
            }
            catch (error) {
                console.error("Create return reason error:", error);
                res.status(500).json({
                    message: "Failed to create return reason",
                });
            }
        });
    }
    static getReturnReasons(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
                const skip = (page - 1) * limit;
                // Column sorting from the admin list; default is name A-Z.
                const sortOrder = String(req.query.sortOrder).toUpperCase() === "DESC"
                    ? "DESC"
                    : "ASC";
                const queryBuilder = repository
                    .createQueryBuilder("returnReason")
                    .orderBy("returnReason.name", sortOrder)
                    .addOrderBy("returnReason.createdAt", "DESC")
                    .skip(skip)
                    .take(limit);
                if (search) {
                    queryBuilder.where("returnReason.name ILIKE :search", {
                        search: `%${search}%`,
                    });
                }
                const [returnReasons, total] = yield queryBuilder.getManyAndCount();
                res.status(200).json({
                    data: returnReasons,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Get return reasons error:", error);
                res.status(500).json({
                    message: "Failed to get return reasons",
                });
            }
        });
    }
    static getReturnReasonById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const { id } = req.params;
                const returnReason = yield repository.findOne({
                    where: { id },
                });
                if (!returnReason) {
                    res.status(404).json({
                        message: "Return reason not found",
                    });
                    return;
                }
                res.status(200).json(returnReason);
            }
            catch (error) {
                console.error("Get return reason error:", error);
                res.status(500).json({
                    message: "Failed to get return reason",
                });
            }
        });
    }
    static updateReturnReason(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const { id } = req.params;
                const dto = (0, class_transformer_1.plainToInstance)(return_reason_dto_1.UpdateReturnReasonDto, req.body);
                const errors = yield validationErrors(dto);
                if (errors.length) {
                    res.status(400).json({
                        message: errors[0],
                        errors,
                    });
                    return;
                }
                const returnReason = yield repository.findOne({
                    where: { id },
                });
                if (!returnReason) {
                    res.status(404).json({
                        message: "Return reason not found",
                    });
                    return;
                }
                if (dto.name !== undefined) {
                    const name = dto.name.trim();
                    if (yield isNameTaken(name, returnReason.id)) {
                        res.status(409).json({
                            message: "Return reason already exists",
                        });
                        return;
                    }
                    returnReason.name = name;
                }
                const updatedReturnReason = yield repository.save(returnReason);
                res.status(200).json(updatedReturnReason);
            }
            catch (error) {
                console.error("Update return reason error:", error);
                res.status(500).json({
                    message: "Failed to update return reason",
                });
            }
        });
    }
    static deleteReturnReason(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const { id } = req.params;
                const returnReason = yield repository.findOne({
                    where: { id },
                });
                if (!returnReason) {
                    res.status(404).json({
                        message: "Return reason not found",
                    });
                    return;
                }
                const used = yield (0, return_usage_service_1.countReturnsUsing)("returnReason", returnReason.name);
                if (used) {
                    res.status(409).json({
                        message: (0, return_usage_service_1.returnUsageMessage)(returnReason.name, used),
                    });
                    return;
                }
                yield repository.remove(returnReason);
                res.status(200).json({
                    message: "Return reason deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete return reason error:", error);
                res.status(500).json({
                    message: "Failed to delete return reason",
                });
            }
        });
    }
}
exports.ReturnReasonController = ReturnReasonController;
