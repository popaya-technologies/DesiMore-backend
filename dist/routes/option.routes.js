"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const option_controller_1 = require("../controllers/option.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid option ID" });
        return;
    }
    next();
});
router.get("/form-options", (0, rbac_middleware_1.checkAnyPermission)("option", ["read", "create", "update"]), option_controller_1.OptionController.options);
router.get("/export", (0, rbac_middleware_1.checkPermission)("option", "read"), option_controller_1.OptionController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("option", "read"), option_controller_1.OptionController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("option", "create"), option_controller_1.OptionController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("option", "read"), option_controller_1.OptionController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("option", "update"), option_controller_1.OptionController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("option", "update"), option_controller_1.OptionController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("option", "delete"), option_controller_1.OptionController.remove);
exports.default = router;
