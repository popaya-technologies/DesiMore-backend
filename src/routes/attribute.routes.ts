import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkAnyPermission, checkPermission } from "../middlewares/rbac.middleware";
import { AttributeController as controller } from "../controllers/attribute.controller";
const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid attribute ID" }); return; }
  next();
});
router.get("/form-options", checkAnyPermission("attribute", ["read", "create", "update"]), controller.options);
router.get("/export", checkPermission("attribute", "read"), controller.export);
router.get("/", checkPermission("attribute", "read"), controller.list);
router.post("/", checkPermission("attribute", "create"), controller.create);
router.get("/:id", checkPermission("attribute", "read"), controller.get);
router.patch("/:id", checkPermission("attribute", "update"), controller.update);
router.put("/:id", checkPermission("attribute", "update"), controller.update);
router.delete("/:id", checkPermission("attribute", "delete"), controller.remove);
export default router;
