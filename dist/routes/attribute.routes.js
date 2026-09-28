"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const attribute_controller_1 = require("../controllers/attribute.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid attribute ID" });
        return;
    }
    next();
});
router.get("/form-options", (0, rbac_middleware_1.checkAnyPermission)("attribute", ["read", "create", "update"]), attribute_controller_1.AttributeController.options);
router.get("/export", (0, rbac_middleware_1.checkPermission)("attribute", "read"), attribute_controller_1.AttributeController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("attribute", "read"), attribute_controller_1.AttributeController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("attribute", "create"), attribute_controller_1.AttributeController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("attribute", "read"), attribute_controller_1.AttributeController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("attribute", "update"), attribute_controller_1.AttributeController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("attribute", "update"), attribute_controller_1.AttributeController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("attribute", "delete"), attribute_controller_1.AttributeController.remove);
exports.default = router;
