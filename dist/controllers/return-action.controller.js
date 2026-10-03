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
exports.ReturnActionController = void 0;
const data_source_1 = require("../data-source");
const return_action_entity_1 = require("../entities/return-action.entity");
class ReturnActionController {
    static createReturnAction(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_action_entity_1.ReturnAction);
                const dto = req.body;
                const name = dto.name.trim();
                const existing = yield repository.findOne({
                    where: { name },
                });
                if (existing) {
                    res.status(409).json({
                        message: "Return action already exists",
                    });
                    return;
                }
                const returnAction = repository.create({
                    name,
                });
                const savedReturnAction = yield repository.save(returnAction);
                res.status(201).json(savedReturnAction);
            }
            catch (error) {
                console.error("Create return action error:", error);
                res.status(500).json({
                    message: "Failed to create return action",
                });
            }
        });
    }
    static getReturnActions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_action_entity_1.ReturnAction);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.max(Number(req.query.limit) || 10, 1);
                const skip = (page - 1) * limit;
                const queryBuilder = repository
                    .createQueryBuilder("returnAction")
                    .orderBy("returnAction.name", "ASC")
                    .addOrderBy("returnAction.createdAt", "DESC")
                    .skip(skip)
                    .take(limit);
                if (search) {
                    queryBuilder.where("returnAction.name ILIKE :search", {
                        search: `%${search}%`,
                    });
                }
                const [returnActions, total] = yield queryBuilder.getManyAndCount();
                res.status(200).json({
                    data: returnActions,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Get return actions error:", error);
                res.status(500).json({
                    message: "Failed to get return actions",
                });
            }
        });
    }
    static getReturnActionById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_action_entity_1.ReturnAction);
                const { id } = req.params;
                const returnAction = yield repository.findOne({
                    where: { id },
                });
                if (!returnAction) {
                    res.status(404).json({
                        message: "Return action not found",
                    });
                    return;
                }
                res.status(200).json(returnAction);
            }
            catch (error) {
                console.error("Get return action error:", error);
                res.status(500).json({
                    message: "Failed to get return action",
                });
            }
        });
    }
    static updateReturnAction(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_action_entity_1.ReturnAction);
                const { id } = req.params;
                const dto = req.body;
                const returnAction = yield repository.findOne({
                    where: { id },
                });
                if (!returnAction) {
                    res.status(404).json({
                        message: "Return action not found",
                    });
                    return;
                }
                if (dto.name !== undefined) {
                    const name = dto.name.trim();
                    const existing = yield repository.findOne({
                        where: { name },
                    });
                    if (existing &&
                        existing.id !== returnAction.id) {
                        res.status(409).json({
                            message: "Return action already exists",
                        });
                        return;
                    }
                    returnAction.name = name;
                }
                const updatedReturnAction = yield repository.save(returnAction);
                res.status(200).json(updatedReturnAction);
            }
            catch (error) {
                console.error("Update return action error:", error);
                res.status(500).json({
                    message: "Failed to update return action",
                });
            }
        });
    }
    static deleteReturnAction(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_action_entity_1.ReturnAction);
                const { id } = req.params;
                const returnAction = yield repository.findOne({
                    where: { id },
                });
                if (!returnAction) {
                    res.status(404).json({
                        message: "Return action not found",
                    });
                    return;
                }
                yield repository.remove(returnAction);
                res.status(200).json({
                    message: "Return action deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete return action error:", error);
                res.status(500).json({
                    message: "Failed to delete return action",
                });
            }
        });
    }
}
exports.ReturnActionController = ReturnActionController;
