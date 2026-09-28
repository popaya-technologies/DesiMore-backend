import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { AttributeGroupController as controller } from "../controllers/attribute-group.controller";
const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid attribute group ID" }); return; }
  next();
});
router.get("/export", checkPermission("attribute-group", "read"), controller.export);
router.get("/", checkPermission("attribute-group", "read"), controller.list);
router.post("/", checkPermission("attribute-group", "create"), controller.create);
router.get("/:id", checkPermission("attribute-group", "read"), controller.get);
router.patch("/:id", checkPermission("attribute-group", "update"), controller.update);
router.put("/:id", checkPermission("attribute-group", "update"), controller.update);
router.delete("/:id", checkPermission("attribute-group", "delete"), controller.remove);
export default router;
