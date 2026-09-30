"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const customer_approval_controller_1 = require("../controllers/customer-approval.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({
            message: "Invalid customer approval ID",
        });
        return;
    }
    next();
});
router.get("/", (0, rbac_middleware_1.checkPermission)("customer-approval", "read"), customer_approval_controller_1.CustomerApprovalController.list);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("customer-approval", "read"), customer_approval_controller_1.CustomerApprovalController.get);
router.post("/", (0, rbac_middleware_1.checkPermission)("customer-approval", "create"), customer_approval_controller_1.CustomerApprovalController.create);
router.post("/:id/approve", (0, rbac_middleware_1.checkPermission)("customer-approval", "update"), customer_approval_controller_1.CustomerApprovalController.approve);
router.post("/:id/reject", (0, rbac_middleware_1.checkPermission)("customer-approval", "update"), customer_approval_controller_1.CustomerApprovalController.reject);
exports.default = router;
