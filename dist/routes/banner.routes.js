"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const banner_controller_1 = require("../controllers/banner.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid banner ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("banner", "read"), banner_controller_1.BannerController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("banner", "read"), banner_controller_1.BannerController.list);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("banner", "read"), banner_controller_1.BannerController.get);
router.post("/", (0, rbac_middleware_1.checkPermission)("banner", "create"), banner_controller_1.BannerController.create);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("banner", "update"), banner_controller_1.BannerController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("banner", "update"), banner_controller_1.BannerController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("banner", "delete"), banner_controller_1.BannerController.remove);
exports.default = router;
