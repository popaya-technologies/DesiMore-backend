"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const customer_group_controller_1 = require("../controllers/customer-group.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid customer group ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("customer-group", "read"), customer_group_controller_1.CustomerGroupController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("customer-group", "read"), customer_group_controller_1.CustomerGroupController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("customer-group", "create"), customer_group_controller_1.CustomerGroupController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("customer-group", "read"), customer_group_controller_1.CustomerGroupController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("customer-group", "update"), customer_group_controller_1.CustomerGroupController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("customer-group", "update"), customer_group_controller_1.CustomerGroupController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("customer-group", "delete"), customer_group_controller_1.CustomerGroupController.remove);
exports.default = router;
