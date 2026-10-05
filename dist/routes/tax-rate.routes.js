"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const tax_rate_controller_1 = require("../controllers/tax-rate.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get("/options", (0, rbac_middleware_1.checkPermission)("tax-rate", "read"), tax_rate_controller_1.TaxRateController.options);
router.delete("/bulk", (0, rbac_middleware_1.checkPermission)("tax-rate", "delete"), tax_rate_controller_1.TaxRateController.bulk);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid tax rate ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("tax-rate", "read"), tax_rate_controller_1.TaxRateController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("tax-rate", "read"), tax_rate_controller_1.TaxRateController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("tax-rate", "create"), tax_rate_controller_1.TaxRateController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("tax-rate", "read"), tax_rate_controller_1.TaxRateController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("tax-rate", "update"), tax_rate_controller_1.TaxRateController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("tax-rate", "update"), tax_rate_controller_1.TaxRateController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("tax-rate", "delete"), tax_rate_controller_1.TaxRateController.remove);
exports.default = router;
