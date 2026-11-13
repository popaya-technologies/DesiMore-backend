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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const data_source_1 = require("../data-source");
const user_entity_1 = require("../entities/user.entity");
const system_user_entity_1 = require("../entities/system-user.entity");
const auth_dto_1 = require("../dto/auth.dto");
const jwt_1 = require("../utils/jwt");
const email_1 = require("../utils/email");
const helper_1 = require("../utils/helper");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const rbac_service_1 = require("../services/rbac.service");
const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
const systemUserRepository = data_source_1.AppDataSource.getRepository(system_user_entity_1.SystemUser);
const profileSelect = [
    "id",
    "firstname",
    "lastname",
    "fullname",
    "username",
    "email",
    "phone",
    "avatar",
    "userRole",
    "createdAt",
    "updatedAt",
];
exports.AuthController = {
    register: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { username, firstname, lastname, email, phone, password } = req.body;
            // Check if username or email already exists
            const existingUser = yield userRepository.findOne({
                where: [{ username }, { email }, { phone }],
            });
            if (existingUser) {
                res.status(400).json({
                    message: "Username, email or phone number already in use",
                });
                return;
            }
            // Create user entity
            const user = new user_entity_1.User();
            user.userRole = "user";
            user.avatar = "";
            user.username = username;
            user.firstname = firstname;
            user.lastname = lastname;
            user.email = email;
            user.phone = phone;
            user.setPassword(password);
            yield userRepository.save(user);
            // Return user data without sensitive information
            const { password: _, refreshToken } = user, userResponse = __rest(user, ["password", "refreshToken"]);
            res.status(201).json(userResponse);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    registerWholesaler: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { username, firstname, lastname, email, phone, password } = req.body;
            // Check if username, email, or phone already exists
            const existingUser = yield userRepository.findOne({
                where: [{ username }, { email }, { phone }],
            });
            if (existingUser) {
                res.status(400).json({
                    message: "Username, email or phone number already in use",
                });
                return;
            }
            // Ensure wholesaler role exists in RBAC
            const wholesalerRole = yield rbac_service_1.RBACService.getRoleByName("wholesaler");
            if (!wholesalerRole) {
                res.status(500).json({
                    message: "Wholesaler role is not configured",
                });
                return;
            }
            // Create user with wholesaler role
            const user = new user_entity_1.User();
            user.userRole = "wholesaler";
            user.avatar = "";
            user.username = username;
            user.firstname = firstname;
            user.lastname = lastname;
            user.email = email;
            user.phone = phone;
            user.setPassword(password);
            yield userRepository.save(user);
            // Link RBAC role (also syncs user.userRole)
            yield rbac_service_1.RBACService.assignRoleToUser(user.id, wholesalerRole.id);
            const { password: _, refreshToken } = user, userResponse = __rest(user, ["password", "refreshToken"]);
            res.status(201).json(userResponse);
        }
        catch (error) {
            console.error("Wholesaler registration error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    login: (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // ← ADD THIS
        try {
            const identifier = String((_b = (_a = req.body.email) !== null && _a !== void 0 ? _a : req.body.username) !== null && _b !== void 0 ? _b : "")
                .trim()
                .toLowerCase();
            const password = String((_c = req.body.password) !== null && _c !== void 0 ? _c : "");
            const user = yield userRepository.findOne({
                where: [{ email: identifier }, { username: identifier }],
                select: [
                    "id",
                    "firstname",
                    "lastname",
                    "username",
                    "email",
                    "phone",
                    "password",
                    "refreshToken",
                    "avatar",
                    "userRole",
                ],
            });
            if (user && (yield user.comparePassword(password))) {
                const { refreshToken } = (0, helper_1.setTokens)(res, user.id, user.email, "user");
                yield userRepository.update(user.id, { refreshToken });
                res.status(200).json({
                    id: user.id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar,
                    userRole: user.userRole,
                    accountType: "user",
                });
                return;
            }
            const systemUser = yield systemUserRepository
                .createQueryBuilder("systemUser")
                .addSelect("systemUser.password")
                .leftJoinAndSelect("systemUser.userGroup", "userGroup")
                .where("LOWER(systemUser.email) = :identifier", { identifier })
                .orWhere("LOWER(systemUser.username) = :identifier", { identifier })
                .getOne();
            if (!systemUser || !(yield systemUser.comparePassword(password))) {
                res.status(401).json({ message: "Invalid credentials" });
                return;
            }
            if (!systemUser.isActive) {
                res.status(403).json({ message: "This system user account is disabled" });
                return;
            }
            (0, helper_1.setTokens)(res, systemUser.id, systemUser.email, "system-user");
            res.status(200).json({
                id: systemUser.id,
                firstname: systemUser.firstName,
                lastname: systemUser.lastName,
                username: systemUser.username,
                email: systemUser.email,
                phone: "",
                avatar: (_d = systemUser.image) !== null && _d !== void 0 ? _d : "",
                userRole: "system-user",
                accountType: "system-user",
                userGroup: systemUser.userGroup
                    ? { id: systemUser.userGroup.id, name: systemUser.userGroup.name }
                    : null,
                accessPermissions: (_f = (_e = systemUser.userGroup) === null || _e === void 0 ? void 0 : _e.accessPermissions) !== null && _f !== void 0 ? _f : [],
                modifyPermissions: (_h = (_g = systemUser.userGroup) === null || _g === void 0 ? void 0 : _g.modifyPermissions) !== null && _h !== void 0 ? _h : [],
            });
        }
        catch (error) {
            next(error);
        }
    }),
    logout: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // ← ADD THIS
        try {
            const { refreshToken } = req.cookies;
            if (refreshToken) {
                const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
                const user = decoded.accountType === "system-user"
                    ? null
                    : yield userRepository.findOne({ where: { id: decoded.userId } });
                if (user) {
                    yield userRepository.update(user.id, { refreshToken: null });
                }
            }
            (0, helper_1.clearTokens)(res);
            res.status(200).json({
                message: "Logged out successfully",
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    refreshToken: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // ← ADD THIS
        try {
            const { refreshToken } = req.cookies;
            if (!refreshToken) {
                res.status(400).json({
                    message: "Refresh token missing",
                });
                return;
            }
            const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
            if (decoded.accountType === "system-user") {
                const systemUser = yield systemUserRepository.findOne({
                    where: { id: decoded.userId, isActive: true },
                });
                if (!systemUser) {
                    res.status(400).json({ message: "Invalid refresh token" });
                    return;
                }
                const tokens = (0, helper_1.setTokens)(res, systemUser.id, systemUser.email, "system-user");
                res.status(200).json(tokens);
                return;
            }
            const user = yield userRepository.findOne({
                where: { id: decoded.userId },
                select: ["id", "email", "refreshToken"],
            });
            if (!user || user.refreshToken !== refreshToken) {
                res.status(400).json({
                    message: "Invalid refresh token",
                });
                return;
            }
            const { accessToken, refreshToken: newRefreshToken } = (0, helper_1.setTokens)(res, user.id, user.email, "user");
            yield userRepository.update(user.id, { refreshToken: newRefreshToken });
            res.status(200).json({
                accessToken,
                refreshToken: newRefreshToken,
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    requestPasswordReset: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // ← ADD THIS
        try {
            const { email } = req.body;
            const emailNormalized = String(email !== null && email !== void 0 ? email : "").trim().toLowerCase();
            const user = yield userRepository
                .createQueryBuilder("user")
                .where("LOWER(user.email) = :email", { email: emailNormalized })
                .getOne();
            if (!user) {
                res.status(400).json({
                    message: "If this email exists, we've sent a reset link",
                });
                return;
            }
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            user.resetPasswordOtp = otp;
            user.resetPasswordOtpExpiry = otpExpiry;
            yield userRepository.save(user);
            yield (0, email_1.sendPasswordResetOtp)(user.email, otp);
            res.status(200).json({
                message: "Password reset OTP sent to your email",
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    resetPassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // ← ADD THIS
        try {
            const { email, otp, newPassword } = req.body;
            const emailNormalized = String(email !== null && email !== void 0 ? email : "").trim().toLowerCase();
            // Load hidden OTP fields (select: false) explicitly
            const user = yield userRepository
                .createQueryBuilder("user")
                .addSelect(["user.resetPasswordOtp", "user.resetPasswordOtpExpiry"])
                .where("LOWER(user.email) = :email", { email: emailNormalized })
                .getOne();
            if (!user) {
                res.status(404).json({
                    message: "User not found",
                });
                return;
            }
            const providedOtp = String(otp !== null && otp !== void 0 ? otp : "").trim();
            const now = Date.now();
            const expiryTime = user.resetPasswordOtpExpiry
                ? new Date(user.resetPasswordOtpExpiry).getTime()
                : 0;
            if (!user.resetPasswordOtp ||
                user.resetPasswordOtp !== providedOtp ||
                !user.resetPasswordOtpExpiry ||
                expiryTime < now) {
                res.status(400).json({
                    message: "Invalid or expired OTP",
                });
                return;
            }
            user.setPassword(newPassword);
            user.resetPasswordOtp = null;
            user.resetPasswordOtpExpiry = null;
            user.refreshToken = null;
            yield userRepository.save(user);
            res.status(200).json({
                message: "Password reset successfully",
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getAllUsers: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // ← ADD THIS
        try {
            const role = typeof req.query.role === "string"
                ? req.query.role.trim().toLowerCase()
                : typeof req.query.userRole === "string"
                    ? req.query.userRole.trim().toLowerCase()
                    : "";
            const users = yield userRepository.find({
                where: role ? { userRole: role } : undefined,
                select: [
                    "id",
                    "firstname",
                    "lastname",
                    "email",
                    "avatar",
                    "userRole",
                    "createdAt",
                    "updatedAt",
                ],
                order: {
                    createdAt: "DESC",
                },
            });
            res.status(200).json(users);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getMe: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            if (req.user.accountType === "system-user") {
                const systemUser = yield systemUserRepository.findOne({
                    where: { id: req.user.id, isActive: true },
                    relations: { userGroup: true },
                });
                if (!systemUser) {
                    res.status(404).json({ message: "System user not found" });
                    return;
                }
                res.status(200).json({
                    user: {
                        id: systemUser.id,
                        firstname: systemUser.firstName,
                        lastname: systemUser.lastName,
                        username: systemUser.username,
                        email: systemUser.email,
                        avatar: (_b = systemUser.image) !== null && _b !== void 0 ? _b : "",
                        userRole: "system-user",
                        accountType: "system-user",
                        userGroup: { id: systemUser.userGroup.id, name: systemUser.userGroup.name },
                        accessPermissions: (_c = systemUser.userGroup.accessPermissions) !== null && _c !== void 0 ? _c : [],
                        modifyPermissions: (_d = systemUser.userGroup.modifyPermissions) !== null && _d !== void 0 ? _d : [],
                    },
                });
                return;
            }
            const user = yield userRepository.findOne({
                where: { id: req.user.id },
                select: profileSelect,
            });
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            const userRoles = yield rbac_service_1.RBACService.getUserRoles(user.id);
            const permissions = yield rbac_service_1.RBACService.getUserPermissions(user.id);
            res.status(200).json({
                user: Object.assign(Object.assign({}, user), { accountType: "user", roles: userRoles.map((userRole) => userRole.role), permissions }),
            });
        }
        catch (error) {
            console.error("Error fetching current user:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    updateMe: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            if (req.user.accountType === "system-user") {
                res.status(403).json({
                    message: "System user profiles must be updated from System Users.",
                });
                return;
            }
            const updateDto = (0, class_transformer_1.plainToInstance)(auth_dto_1.UpdateProfileDto, req.body);
            const errors = yield (0, class_validator_1.validate)(updateDto, {
                whitelist: true,
                forbidNonWhitelisted: true,
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const allowedFields = [
                "firstname",
                "lastname",
                "username",
                "email",
                "phone",
                "avatar",
            ];
            const hasUpdates = allowedFields.some((field) => updateDto[field] !== undefined);
            if (!hasUpdates) {
                res.status(400).json({
                    message: "At least one profile field is required",
                });
                return;
            }
            const user = yield userRepository.findOne({
                where: { id: req.user.id },
            });
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            const normalizedUsername = updateDto.username !== undefined
                ? updateDto.username.trim().toLowerCase()
                : undefined;
            const normalizedEmail = updateDto.email !== undefined
                ? updateDto.email.trim().toLowerCase()
                : undefined;
            const normalizedPhone = updateDto.phone !== undefined ? updateDto.phone.trim() : undefined;
            if (normalizedUsername && normalizedUsername !== user.username) {
                const existingUser = yield userRepository.findOne({
                    where: { username: normalizedUsername },
                    select: ["id"],
                });
                if (existingUser && existingUser.id !== user.id) {
                    res.status(400).json({ message: "Username already in use" });
                    return;
                }
            }
            if (normalizedEmail && normalizedEmail !== user.email) {
                const existingUser = yield userRepository
                    .createQueryBuilder("user")
                    .select(["user.id"])
                    .where("LOWER(user.email) = :email", { email: normalizedEmail })
                    .getOne();
                if (existingUser && existingUser.id !== user.id) {
                    res.status(400).json({ message: "Email already in use" });
                    return;
                }
            }
            if (normalizedPhone && normalizedPhone !== user.phone) {
                const existingUser = yield userRepository.findOne({
                    where: { phone: normalizedPhone },
                    select: ["id"],
                });
                if (existingUser && existingUser.id !== user.id) {
                    res.status(400).json({ message: "Phone number already in use" });
                    return;
                }
            }
            if (updateDto.firstname !== undefined) {
                user.firstname = updateDto.firstname.trim();
            }
            if (updateDto.lastname !== undefined) {
                user.lastname = updateDto.lastname.trim();
            }
            if (normalizedUsername !== undefined) {
                user.username = normalizedUsername;
            }
            if (normalizedEmail !== undefined) {
                user.email = normalizedEmail;
            }
            if (normalizedPhone !== undefined) {
                user.phone = normalizedPhone;
            }
            if (updateDto.avatar !== undefined) {
                user.avatar = updateDto.avatar.trim() || null;
            }
            yield userRepository.save(user);
            const updatedUser = yield userRepository.findOne({
                where: { id: user.id },
                select: profileSelect,
            });
            res.status(200).json({
                message: "Profile updated successfully",
                user: updatedUser,
            });
        }
        catch (error) {
            console.error("Error updating profile:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getUserById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // ← ADD THIS
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    message: "User ID is required",
                });
                return;
            }
            const user = yield userRepository.findOne({
                where: { id },
                select: [
                    "id",
                    "username",
                    "firstname",
                    "lastname",
                    "email",
                    "phone",
                    "avatar",
                    "userRole",
                    "createdAt",
                    "updatedAt",
                ],
            });
            if (!user) {
                res.status(404).json({
                    message: "User not found",
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            console.error("Error fetching user by ID:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    deleteUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ message: "User ID is required" });
                return;
            }
            const user = yield userRepository.findOne({ where: { id } });
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            yield userRepository.delete(id);
            res.status(200).json({
                message: "User deleted successfully",
                data: { id },
            });
        }
        catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
};
