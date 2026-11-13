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
exports.SystemUserGroupController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const system_user_group_entity_1 = require("../entities/system-user-group.entity");
const system_user_entity_1 = require("../entities/system-user.entity");
const system_user_group_dto_1 = require("../dto/system-user-group.dto");
const systemUserGroupRepository = data_source_1.AppDataSource.getRepository(system_user_group_entity_1.SystemUserGroup);
const buildResponse = (systemUserGroup) => {
    var _a, _b;
    return {
        id: systemUserGroup.id,
        name: systemUserGroup.name,
        accessPermissions: (_a = systemUserGroup.accessPermissions) !== null && _a !== void 0 ? _a : [],
        modifyPermissions: (_b = systemUserGroup.modifyPermissions) !== null && _b !== void 0 ? _b : [],
        createdAt: systemUserGroup.createdAt,
        updatedAt: systemUserGroup.updatedAt,
    };
};
exports.SystemUserGroupController = {
    // Create System User Group
    createSystemUserGroup: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const systemUserGroupData = new system_user_group_dto_1.CreateSystemUserGroupDto();
            Object.assign(systemUserGroupData, req.body);
            const errors = yield (0, class_validator_1.validate)(systemUserGroupData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const name = systemUserGroupData.name.trim();
            const accessPermissions = [...new Set(systemUserGroupData.accessPermissions)];
            const modifyPermissions = [...new Set(systemUserGroupData.modifyPermissions)];
            if (modifyPermissions.some((permission) => !accessPermissions.includes(permission))) {
                res.status(400).json({
                    message: "Every modify permission must also have access permission.",
                });
                return;
            }
            const existingGroup = yield systemUserGroupRepository.findOne({
                where: { name },
            });
            if (existingGroup) {
                res.status(409).json({
                    message: "System user group already exists.",
                });
                return;
            }
            const systemUserGroup = systemUserGroupRepository.create({
                name,
                accessPermissions,
                modifyPermissions,
            });
            yield systemUserGroupRepository.save(systemUserGroup);
            res
                .status(201)
                .json(buildResponse(systemUserGroup));
        }
        catch (error) {
            console.error("Create system user group error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Get System User Groups
    getSystemUserGroups: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(String(page), 10) || 1, 1);
            const take = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);
            const skip = (currentPage - 1) * take;
            const query = systemUserGroupRepository.createQueryBuilder("systemUserGroup");
            if (search && String(search).trim()) {
                query.andWhere("systemUserGroup.name ILIKE :search", {
                    search: `%${String(search).trim()}%`,
                });
            }
            query
                .orderBy("systemUserGroup.createdAt", "DESC")
                .skip(skip)
                .take(take);
            const [systemUserGroups, total] = yield query.getManyAndCount();
            res.status(200).json({
                data: systemUserGroups.map(buildResponse),
                meta: {
                    total,
                    page: currentPage,
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error("Get system user groups error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Get Single System User Group
    getSystemUserGroupById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const systemUserGroup = yield systemUserGroupRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!systemUserGroup) {
                res.status(404).json({
                    message: "System User Group not found.",
                });
                return;
            }
            res.status(200).json(buildResponse(systemUserGroup));
        }
        catch (error) {
            console.error("Get system user group error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Update System User Group
    updateSystemUserGroup: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const systemUserGroup = yield systemUserGroupRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!systemUserGroup) {
                res.status(404).json({
                    message: "System User Group not found.",
                });
                return;
            }
            const updateData = new system_user_group_dto_1.UpdateSystemUserGroupDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.name !== undefined) {
                const name = updateData.name.trim();
                const existingGroup = yield systemUserGroupRepository
                    .createQueryBuilder("systemUserGroup")
                    .where("LOWER(systemUserGroup.name) = LOWER(:name)", { name })
                    .andWhere("systemUserGroup.id != :id", { id: systemUserGroup.id })
                    .getOne();
                if (existingGroup) {
                    res.status(409).json({
                        message: "System user group already exists.",
                    });
                    return;
                }
                systemUserGroup.name = name;
            }
            const accessPermissions = [...new Set(updateData.accessPermissions)];
            const modifyPermissions = [...new Set(updateData.modifyPermissions)];
            if (modifyPermissions.some((permission) => !accessPermissions.includes(permission))) {
                res.status(400).json({
                    message: "Every modify permission must also have access permission.",
                });
                return;
            }
            systemUserGroup.accessPermissions = accessPermissions;
            systemUserGroup.modifyPermissions = modifyPermissions;
            yield systemUserGroupRepository.save(systemUserGroup);
            res.status(200).json(buildResponse(systemUserGroup));
        }
        catch (error) {
            console.error("Update system user group error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Delete System User Group
    deleteSystemUserGroup: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const systemUserGroup = yield systemUserGroupRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!systemUserGroup) {
                res.status(404).json({
                    message: "System User Group not found.",
                });
                return;
            }
            const assignedUserCount = yield data_source_1.AppDataSource
                .getRepository(system_user_entity_1.SystemUser)
                .count({
                where: { userGroupId: systemUserGroup.id },
            });
            if (assignedUserCount > 0) {
                res.status(409).json({
                    message: `This group is assigned to ${assignedUserCount} system user${assignedUserCount === 1 ? "" : "s"} and cannot be deleted.`,
                });
                return;
            }
            yield systemUserGroupRepository.remove(systemUserGroup);
            res.status(200).json({
                message: "System User Group deleted successfully.",
            });
        }
        catch (error) {
            console.error("Delete system user group error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
};
