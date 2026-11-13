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
exports.SystemUserController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const system_user_entity_1 = require("../entities/system-user.entity");
const system_user_group_entity_1 = require("../entities/system-user-group.entity");
const system_user_dto_1 = require("../dto/system-user.dto");
const systemUserRepository = data_source_1.AppDataSource.getRepository(system_user_entity_1.SystemUser);
const systemUserGroupRepository = data_source_1.AppDataSource.getRepository(system_user_group_entity_1.SystemUserGroup);
const buildResponse = (user) => {
    var _a;
    return {
        id: user.id,
        username: user.username,
        userGroupId: user.userGroupId,
        userGroup: user.userGroup
            ? { id: user.userGroup.id, name: user.userGroup.name }
            : null,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: (_a = user.image) !== null && _a !== void 0 ? _a : "",
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};
exports.SystemUserController = {
    // Create System User
    createSystemUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const systemUserData = new system_user_dto_1.CreateSystemUserDto();
            Object.assign(systemUserData, req.body);
            const errors = yield (0, class_validator_1.validate)(systemUserData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const userGroup = yield systemUserGroupRepository.findOne({
                where: { id: systemUserData.userGroupId },
            });
            if (!userGroup) {
                res.status(400).json({ message: "Selected User Group does not exist." });
                return;
            }
            if (systemUserData.password !==
                systemUserData.confirmPassword) {
                res.status(400).json({
                    message: "Password and Confirm Password do not match.",
                });
                return;
            }
            const username = systemUserData.username
                .trim()
                .toLowerCase();
            const email = systemUserData.email
                .trim()
                .toLowerCase();
            const existingUsername = yield systemUserRepository.findOne({
                where: { username },
            });
            if (existingUsername) {
                res.status(409).json({
                    message: "Username already exists.",
                });
                return;
            }
            const existingEmail = yield systemUserRepository.findOne({
                where: { email },
            });
            if (existingEmail) {
                res.status(409).json({
                    message: "E-Mail already exists.",
                });
                return;
            }
            const systemUser = systemUserRepository.create({
                username,
                userGroupId: userGroup.id,
                userGroup,
                firstName: systemUserData.firstName.trim(),
                lastName: systemUserData.lastName.trim(),
                email,
                image: ((_a = systemUserData.image) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                isActive: (_b = systemUserData.isActive) !== null && _b !== void 0 ? _b : true,
            });
            systemUser.setPassword(systemUserData.password);
            yield systemUserRepository.save(systemUser);
            res.status(201).json(buildResponse(systemUser));
        }
        catch (error) {
            console.error("Create system user error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Get System Users
    getSystemUsers: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { username, status, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(String(page), 10) || 1, 1);
            const take = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);
            const skip = (currentPage - 1) * take;
            const query = systemUserRepository
                .createQueryBuilder("systemUser")
                .leftJoinAndSelect("systemUser.userGroup", "userGroup");
            // Username filter
            if (username &&
                String(username).trim()) {
                query.andWhere("systemUser.username ILIKE :username", {
                    username: `%${String(username).trim()}%`,
                });
            }
            // Status filter
            if (status && String(status).trim()) {
                const normalizedStatus = String(status)
                    .trim()
                    .toLowerCase();
                if (normalizedStatus === "enabled" ||
                    normalizedStatus === "active" ||
                    normalizedStatus === "true") {
                    query.andWhere("systemUser.isActive = :isActive", {
                        isActive: true,
                    });
                }
                if (normalizedStatus === "disabled" ||
                    normalizedStatus === "inactive" ||
                    normalizedStatus === "false") {
                    query.andWhere("systemUser.isActive = :isActive", {
                        isActive: false,
                    });
                }
            }
            query
                .orderBy("systemUser.createdAt", "DESC")
                .skip(skip)
                .take(take);
            const [users, total] = yield query.getManyAndCount();
            res.status(200).json({
                data: users.map(buildResponse),
                meta: {
                    total,
                    page: currentPage,
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error("Get system users error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Get Single System User
    getSystemUserById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const systemUser = yield systemUserRepository.findOne({
                where: {
                    id: req.params.id,
                },
                relations: { userGroup: true },
            });
            if (!systemUser) {
                res.status(404).json({
                    message: "System User not found.",
                });
                return;
            }
            res.status(200).json(buildResponse(systemUser));
        }
        catch (error) {
            console.error("Get system user error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Update System User
    updateSystemUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const systemUser = yield systemUserRepository.findOne({
                where: {
                    id: req.params.id,
                },
                relations: { userGroup: true },
            });
            if (!systemUser) {
                res.status(404).json({
                    message: "System User not found.",
                });
                return;
            }
            const updateData = new system_user_dto_1.UpdateSystemUserDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.accountType) === "system-user" &&
                req.user.id === systemUser.id &&
                updateData.isActive === false) {
                res.status(409).json({ message: "You cannot disable your own system user account." });
                return;
            }
            const userGroup = yield systemUserGroupRepository.findOne({
                where: { id: updateData.userGroupId },
            });
            if (!userGroup) {
                res.status(400).json({ message: "Selected User Group does not exist." });
                return;
            }
            const isRemovingActiveAdministrator = systemUser.isActive &&
                ((_b = systemUser.userGroup) === null || _b === void 0 ? void 0 : _b.name.toLowerCase()) === "administrator" &&
                (!updateData.isActive || userGroup.name.toLowerCase() !== "administrator");
            if (isRemovingActiveAdministrator) {
                const otherActiveAdministrators = yield systemUserRepository
                    .createQueryBuilder("otherUser")
                    .innerJoin("otherUser.userGroup", "otherGroup")
                    .where("otherUser.isActive = true")
                    .andWhere("LOWER(otherGroup.name) = :groupName", { groupName: "administrator" })
                    .andWhere("otherUser.id != :id", { id: systemUser.id })
                    .getCount();
                if (otherActiveAdministrators === 0) {
                    res.status(409).json({ message: "At least one active Administrator system user is required." });
                    return;
                }
            }
            if (updateData.password !== undefined ||
                updateData.confirmPassword !==
                    undefined) {
                if (!updateData.password ||
                    !updateData.confirmPassword) {
                    res.status(400).json({
                        message: "Both Password and Confirm Password are required when changing the password.",
                    });
                    return;
                }
                if (updateData.password !==
                    updateData.confirmPassword) {
                    res.status(400).json({
                        message: "Password and Confirm Password do not match.",
                    });
                    return;
                }
            }
            const username = updateData.username
                .trim()
                .toLowerCase();
            const email = updateData.email
                .trim()
                .toLowerCase();
            // Check username uniqueness
            const existingUsername = yield systemUserRepository
                .createQueryBuilder("systemUser")
                .where("LOWER(systemUser.username) = LOWER(:username)", { username })
                .andWhere("systemUser.id != :id", { id: systemUser.id })
                .getOne();
            if (existingUsername) {
                res.status(409).json({
                    message: "Username already exists.",
                });
                return;
            }
            // Check email uniqueness
            const existingEmail = yield systemUserRepository
                .createQueryBuilder("systemUser")
                .where("LOWER(systemUser.email) = LOWER(:email)", { email })
                .andWhere("systemUser.id != :id", { id: systemUser.id })
                .getOne();
            if (existingEmail) {
                res.status(409).json({
                    message: "E-Mail already exists.",
                });
                return;
            }
            systemUser.username = username;
            systemUser.userGroupId = userGroup.id;
            systemUser.userGroup = userGroup;
            systemUser.firstName =
                updateData.firstName.trim();
            systemUser.lastName =
                updateData.lastName.trim();
            systemUser.email = email;
            systemUser.image =
                ((_c = updateData.image) === null || _c === void 0 ? void 0 : _c.trim()) || null;
            systemUser.isActive =
                updateData.isActive;
            if (updateData.password) {
                systemUser.setPassword(updateData.password);
            }
            yield systemUserRepository.save(systemUser);
            res.status(200).json(buildResponse(systemUser));
        }
        catch (error) {
            console.error("Update system user error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    // Delete System User
    deleteSystemUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const systemUser = yield systemUserRepository.findOne({
                where: {
                    id: req.params.id,
                },
                relations: { userGroup: true },
            });
            if (!systemUser) {
                res.status(404).json({
                    message: "System User not found.",
                });
                return;
            }
            if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.accountType) === "system-user" && req.user.id === systemUser.id) {
                res.status(409).json({ message: "You cannot delete your own system user account." });
                return;
            }
            if (systemUser.isActive && ((_b = systemUser.userGroup) === null || _b === void 0 ? void 0 : _b.name.toLowerCase()) === "administrator") {
                const otherActiveAdministrators = yield systemUserRepository
                    .createQueryBuilder("otherUser")
                    .innerJoin("otherUser.userGroup", "otherGroup")
                    .where("otherUser.isActive = true")
                    .andWhere("LOWER(otherGroup.name) = :groupName", { groupName: "administrator" })
                    .andWhere("otherUser.id != :id", { id: systemUser.id })
                    .getCount();
                if (otherActiveAdministrators === 0) {
                    res.status(409).json({ message: "The last active Administrator system user cannot be deleted." });
                    return;
                }
            }
            yield systemUserRepository.remove(systemUser);
            res.status(200).json({
                message: "System User deleted successfully.",
            });
        }
        catch (error) {
            console.error("Delete system user error:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
};
