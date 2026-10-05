"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const tax_class_controller_1 = require("../controllers/tax-class.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get("/tax-rates", (0, rbac_middleware_1.checkPermission)("tax-class", "read"), tax_class_controller_1.TaxClassController.rates);
router.post("/tax-rates", (0, rbac_middleware_1.checkPermission)("tax-class", "create"), tax_class_controller_1.TaxClassController.createRate);
router.delete("/bulk", (0, rbac_middleware_1.checkPermission)("tax-class", "delete"), tax_class_controller_1.TaxClassController.bulk);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid tax class ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("tax-class", "read"), tax_class_controller_1.TaxClassController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("tax-class", "read"), tax_class_controller_1.TaxClassController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("tax-class", "create"), tax_class_controller_1.TaxClassController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("tax-class", "read"), tax_class_controller_1.TaxClassController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("tax-class", "update"), tax_class_controller_1.TaxClassController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("tax-class", "update"), tax_class_controller_1.TaxClassController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("tax-class", "delete"), tax_class_controller_1.TaxClassController.remove);
exports.default = router;
