"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const return_status_controller_1 = require("../controllers/return-status.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.delete("/bulk", (0, rbac_middleware_1.checkPermission)("return-status", "delete"), return_status_controller_1.ReturnStatusController.bulk);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid return status ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("return-status", "read"), return_status_controller_1.ReturnStatusController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("return-status", "read"), return_status_controller_1.ReturnStatusController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("return-status", "create"), return_status_controller_1.ReturnStatusController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("return-status", "read"), return_status_controller_1.ReturnStatusController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("return-status", "update"), return_status_controller_1.ReturnStatusController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("return-status", "update"), return_status_controller_1.ReturnStatusController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("return-status", "delete"), return_status_controller_1.ReturnStatusController.remove);
exports.default = router;
