"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const page_controller_1 = require("../controllers/page.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid page ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("page", "read"), page_controller_1.PageController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("page", "read"), page_controller_1.PageController.list);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("page", "read"), page_controller_1.PageController.get);
router.post("/", (0, rbac_middleware_1.checkPermission)("page", "create"), page_controller_1.PageController.create);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("page", "update"), page_controller_1.PageController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("page", "update"), page_controller_1.PageController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("page", "delete"), page_controller_1.PageController.remove);
exports.default = router;
