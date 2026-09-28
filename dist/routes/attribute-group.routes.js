"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const attribute_group_controller_1 = require("../controllers/attribute-group.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid attribute group ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("attribute-group", "read"), attribute_group_controller_1.AttributeGroupController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("attribute-group", "read"), attribute_group_controller_1.AttributeGroupController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("attribute-group", "create"), attribute_group_controller_1.AttributeGroupController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("attribute-group", "read"), attribute_group_controller_1.AttributeGroupController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("attribute-group", "update"), attribute_group_controller_1.AttributeGroupController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("attribute-group", "update"), attribute_group_controller_1.AttributeGroupController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("attribute-group", "delete"), attribute_group_controller_1.AttributeGroupController.remove);
exports.default = router;
