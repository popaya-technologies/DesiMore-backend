import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { WeightClassController as controller } from "../controllers/weight-class.controller";
const router = Router();
router.use(authenticate);
router.delete("/bulk", checkPermission("weight-class", "delete"), controller.bulk);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid weight class ID" }); return; }
  next();
});
router.get("/export", checkPermission("weight-class", "read"), controller.export);
router.get("/", checkPermission("weight-class", "read"), controller.list);
router.post("/", checkPermission("weight-class", "create"), controller.create);
router.get("/:id", checkPermission("weight-class", "read"), controller.get);
router.patch("/:id", checkPermission("weight-class", "update"), controller.update);
router.put("/:id", checkPermission("weight-class", "update"), controller.update);
router.delete("/:id", checkPermission("weight-class", "delete"), controller.remove);
export default router;
