"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.AuthController.register);
router.post("/register/wholesaler", auth_controller_1.AuthController.registerWholesaler);
router.post("/login", auth_controller_1.AuthController.login);
router.post("/logout", auth_controller_1.AuthController.logout);
router.post("/refresh-token", auth_controller_1.AuthController.refreshToken);
router.post("/request-password-reset", auth_controller_1.AuthController.requestPasswordReset);
router.post("/reset-password", auth_controller_1.AuthController.resetPassword);
router.get("/users", auth_controller_1.AuthController.getAllUsers);
router.get("/users/:id", auth_controller_1.AuthController.getUserById);
router.delete("/users/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("user", "delete"), auth_controller_1.AuthController.deleteUser);
exports.default = router;
