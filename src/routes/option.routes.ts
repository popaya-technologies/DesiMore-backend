import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkAnyPermission, checkPermission } from "../middlewares/rbac.middleware";
import { OptionController as controller } from "../controllers/option.controller";
const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid option ID" }); return; }
  next();
});
router.get("/form-options", checkAnyPermission("option", ["read", "create", "update"]), controller.options);
router.get("/export", checkPermission("option", "read"), controller.export);
router.get("/", checkPermission("option", "read"), controller.list);
router.post("/", checkPermission("option", "create"), controller.create);
router.get("/:id", checkPermission("option", "read"), controller.get);
router.patch("/:id", checkPermission("option", "update"), controller.update);
router.put("/:id", checkPermission("option", "update"), controller.update);
router.delete("/:id", checkPermission("option", "delete"), controller.remove);
export default router;
