import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { CustomerGroupController as controller } from "../controllers/customer-group.controller";
const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid customer group ID" }); return; }
  next();
});
router.get("/export", checkPermission("customer-group", "read"), controller.export);
router.get("/", checkPermission("customer-group", "read"), controller.list);
router.post("/", checkPermission("customer-group", "create"), controller.create);
router.get("/:id", checkPermission("customer-group", "read"), controller.get);
router.patch("/:id", checkPermission("customer-group", "update"), controller.update);
router.put("/:id", checkPermission("customer-group", "update"), controller.update);
router.delete("/:id", checkPermission("customer-group", "delete"), controller.remove);
export default router;
