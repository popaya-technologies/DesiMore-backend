"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_validator_1 = require("class-validator");
const express_1 = require("express");
const recipe_controller_1 = require("../controllers/recipe.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid recipe ID" });
        return;
    }
    next();
});
router.get("/export", (0, rbac_middleware_1.checkPermission)("recipe", "read"), recipe_controller_1.RecipeController.export);
router.get("/", (0, rbac_middleware_1.checkPermission)("recipe", "read"), recipe_controller_1.RecipeController.list);
router.post("/", (0, rbac_middleware_1.checkPermission)("recipe", "create"), recipe_controller_1.RecipeController.create);
router.get("/:id", (0, rbac_middleware_1.checkPermission)("recipe", "read"), recipe_controller_1.RecipeController.get);
router.patch("/:id", (0, rbac_middleware_1.checkPermission)("recipe", "update"), recipe_controller_1.RecipeController.update);
router.put("/:id", (0, rbac_middleware_1.checkPermission)("recipe", "update"), recipe_controller_1.RecipeController.update);
router.delete("/:id", (0, rbac_middleware_1.checkPermission)("recipe", "delete"), recipe_controller_1.RecipeController.remove);
exports.default = router;
