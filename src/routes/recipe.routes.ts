import { isUUID } from "class-validator";
import { Router } from "express";

import { RecipeController as controller } from "../controllers/recipe.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid recipe ID" }); return; }
  next();
});
router.get("/export", checkPermission("recipe", "read"), controller.export);
router.get("/", checkPermission("recipe", "read"), controller.list);
router.post("/", checkPermission("recipe", "create"), controller.create);
router.get("/:id", checkPermission("recipe", "read"), controller.get);
router.patch("/:id", checkPermission("recipe", "update"), controller.update);
router.put("/:id", checkPermission("recipe", "update"), controller.update);
router.delete("/:id", checkPermission("recipe", "delete"), controller.remove);
export default router;
