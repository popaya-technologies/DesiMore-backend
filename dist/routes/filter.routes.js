"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const filter_controller_1 = require("../controllers/filter.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid filter ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("filter", "read"), filter_controller_1.FilterController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("filter", "read"), filter_controller_1.FilterController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("filter", "create"), filter_controller_1.FilterController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("filter", "read"), filter_controller_1.FilterController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("filter", "update"), filter_controller_1.FilterController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("filter", "update"), filter_controller_1.FilterController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("filter", "delete"), filter_controller_1.FilterController.remove);
exports.default = router;
