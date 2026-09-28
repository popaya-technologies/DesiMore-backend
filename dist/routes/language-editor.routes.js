"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const language_editor_controller_1 = require("../controllers/language-editor.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid translation ID" });
        return;
    }
    next();
});
router.get("/form-options", (0, rbac_middleware_1.checkPermission)("language-editor", "read"), language_editor_controller_1.LanguageEditorController.options);
router.get("/export", (0, rbac_middleware_1.checkPermission)("language-editor", "read"), language_editor_controller_1.LanguageEditorController.export);
router.delete("/bulk", (0, rbac_middleware_1.checkPermission)("language-editor", "delete"), language_editor_controller_1.LanguageEditorController.bulkDelete);
router.get("/", (0, rbac_middleware_1.checkPermission)("language-editor", "read"), language_editor_controller_1.LanguageEditorController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("language-editor", "create"), language_editor_controller_1.LanguageEditorController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("language-editor", "read"), language_editor_controller_1.LanguageEditorController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("language-editor", "update"), language_editor_controller_1.LanguageEditorController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("language-editor", "update"), language_editor_controller_1.LanguageEditorController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("language-editor", "delete"), language_editor_controller_1.LanguageEditorController.remove);
exports.default = router;
