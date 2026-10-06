"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const length_class_controller_1 = require("../controllers/length-class.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.delete("/bulk", (0, rbac_middleware_1.checkPermission)("length-class", "delete"), length_class_controller_1.LengthClassController.bulk);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid length class ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("length-class", "read"), length_class_controller_1.LengthClassController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("length-class", "read"), length_class_controller_1.LengthClassController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("length-class", "create"), length_class_controller_1.LengthClassController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("length-class", "read"), length_class_controller_1.LengthClassController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("length-class", "update"), length_class_controller_1.LengthClassController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("length-class", "update"), length_class_controller_1.LengthClassController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("length-class", "delete"), length_class_controller_1.LengthClassController.remove);
exports.default = router;
