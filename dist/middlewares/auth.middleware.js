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
exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const data_source_1 = require("../data-source");
const user_entity_1 = require("../entities/user.entity");
const rbac_service_1 = require("../services/rbac.service");
const system_user_entity_1 = require("../entities/system-user.entity");
const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
const systemUserRepository = data_source_1.AppDataSource.getRepository(system_user_entity_1.SystemUser);
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            res.status(401).json({ message: "Access token missing" });
            return;
        }
        const decoded = (0, jwt_1.verifyAccessToken)(accessToken);
        if (decoded.accountType === "system-user") {
            const systemUser = yield systemUserRepository.findOne({
                where: { id: decoded.userId, isActive: true },
                relations: { userGroup: true },
            });
            if (!systemUser) {
                res.status(401).json({ message: "System user not found or disabled" });
                return;
            }
            const accessPermissions = (_b = (_a = systemUser.userGroup) === null || _a === void 0 ? void 0 : _a.accessPermissions) !== null && _b !== void 0 ? _b : [];
            const modifyPermissions = (_d = (_c = systemUser.userGroup) === null || _c === void 0 ? void 0 : _c.modifyPermissions) !== null && _d !== void 0 ? _d : [];
            req.user = Object.assign(Object.assign({}, systemUser), { accountType: "system-user", userRole: "system-user", accessPermissions,
                modifyPermissions, permissions: [
                    ...accessPermissions.map((resource) => ({ resource, action: "read" })),
                    ...modifyPermissions.flatMap((resource) => ["create", "update", "delete"].map((action) => ({ resource, action }))),
                ] });
            next();
            return;
        }
        const user = yield userRepository.findOne({
            where: { id: decoded.userId },
            select: [
                "id",
                "firstname",
                "lastname",
                "username",
                "email",
                "phone",
                "avatar",
                "userRole",
            ],
        });
        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }
        // Get user roles and permissions
        const userRoles = yield rbac_service_1.RBACService.getUserRoles(user.id);
        const permissions = yield rbac_service_1.RBACService.getUserPermissions(user.id);
        // Use type assertion to add roles and permissions
        req.user = Object.assign(Object.assign({}, user), { accountType: "user", roles: userRoles.map((ur) => ur.role), permissions: permissions });
        next();
    }
    catch (error) {
        console.error(error);
        res.status(401).json({ message: "Invalid access token" });
        return;
    }
});
exports.authenticate = authenticate;
