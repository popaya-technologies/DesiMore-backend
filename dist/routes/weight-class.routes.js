"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const weight_class_controller_1 = require("../controllers/weight-class.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.delete("/bulk", (0, rbac_middleware_1.checkPermission)("weight-class", "delete"), weight_class_controller_1.WeightClassController.bulk);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid weight class ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("weight-class", "read"), weight_class_controller_1.WeightClassController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("weight-class", "read"), weight_class_controller_1.WeightClassController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("weight-class", "create"), weight_class_controller_1.WeightClassController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("weight-class", "read"), weight_class_controller_1.WeightClassController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("weight-class", "update"), weight_class_controller_1.WeightClassController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("weight-class", "update"), weight_class_controller_1.WeightClassController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("weight-class", "delete"), weight_class_controller_1.WeightClassController.remove);
exports.default = router;
