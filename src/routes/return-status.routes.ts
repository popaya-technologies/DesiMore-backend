import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { ReturnStatusController as controller } from "../controllers/return-status.controller";
const router = Router();
router.use(authenticate);
router.delete("/bulk", checkPermission("return-status", "delete"), controller.bulk);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid return status ID" }); return; }
  next();
});
router.get("/export", checkPermission("return-status", "read"), controller.export);
router.get("/", checkPermission("return-status", "read"), controller.list);
router.post("/", checkPermission("return-status", "create"), controller.create);
router.get("/:id", checkPermission("return-status", "read"), controller.get);
router.patch("/:id", checkPermission("return-status", "update"), controller.update);
router.put("/:id", checkPermission("return-status", "update"), controller.update);
router.delete("/:id", checkPermission("return-status", "delete"), controller.remove);
export default router;
