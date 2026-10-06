"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const error_log_controller_1 = require("../controllers/error-log.controller");
const router = (0, express_1.Router)();
router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
});
router.use(auth_middleware_1.authenticate);
router.get("/", (0, rbac_middleware_1.checkPermission)("error-log", "read"), error_log_controller_1.ErrorLogController.read);
router.get("/download", (0, rbac_middleware_1.checkPermission)("error-log", "read"), error_log_controller_1.ErrorLogController.download);
router.delete("/", (0, rbac_middleware_1.checkPermission)("error-log", "delete"), error_log_controller_1.ErrorLogController.clear);
exports.default = router;
