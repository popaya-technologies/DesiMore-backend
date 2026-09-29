import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { FilterController as controller } from "../controllers/filter.controller";
const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid filter ID" }); return; }
  next();
});
router.get("/export", checkPermission("filter", "read"), controller.export);
router.get("/", checkPermission("filter", "read"), controller.list);
router.post("/", checkPermission("filter", "create"), controller.create);
router.get("/:id", checkPermission("filter", "read"), controller.get);
router.patch("/:id", checkPermission("filter", "update"), controller.update);
router.put("/:id", checkPermission("filter", "update"), controller.update);
router.delete("/:id", checkPermission("filter", "delete"), controller.remove);
export default router;
