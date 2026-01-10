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
const jwt_1 = require("../utils/jwt");
const email_1 = require("../utils/email");
const helper_1 = require("../utils/helper");
const rbac_service_1 = require("../services/rbac.service");
const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
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
        // ← ADD THIS
        try {
            const { email, password } = req.body;
            const user = yield userRepository.findOne({
                where: { email },
                select: [
                    "id",
                    "firstname",
                    "lastname",
                    "email",
                    "password",
                    "refreshToken",
                    "avatar",
                    "userRole",
                ],
            });
            if (!user) {
                res.status(401).json({ message: "Invalid credentials" });
                return;
            }
            const isMatch = yield user.comparePassword(password);
            if (!isMatch) {
                res.status(401).json({ message: "Invalid credentials" });
                return;
            }
            const { accessToken, refreshToken } = (0, helper_1.setTokens)(res, user.id, user.email);
            user.refreshToken = refreshToken;
            yield userRepository.save(user);
            res.status(200).json({
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                avatar: user.avatar,
                userRole: user.userRole,
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
                const user = yield userRepository.findOne({
                    where: { id: decoded.userId },
                });
                if (user) {
                    user.refreshToken = null;
                    yield userRepository.save(user);
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
            const user = yield userRepository.findOne({
                where: { id: decoded.userId },
            });
            if (!user || user.refreshToken !== refreshToken) {
                res.status(400).json({
                    message: "Invalid refresh token",
                });
                return;
            }
            const { accessToken, refreshToken: newRefreshToken } = (0, helper_1.setTokens)(res, user.id, user.email);
            user.refreshToken = newRefreshToken;
            yield userRepository.save(user);
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
