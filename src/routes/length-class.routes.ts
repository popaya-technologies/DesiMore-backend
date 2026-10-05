import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { LengthClassController as controller } from "../controllers/length-class.controller";
const router = Router();
router.use(authenticate);
router.delete("/bulk", checkPermission("length-class", "delete"), controller.bulk);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid length class ID" }); return; }
  next();
});
router.get("/export", checkPermission("length-class", "read"), controller.export);
router.get("/", checkPermission("length-class", "read"), controller.list);
router.post("/", checkPermission("length-class", "create"), controller.create);
router.get("/:id", checkPermission("length-class", "read"), controller.get);
router.patch("/:id", checkPermission("length-class", "update"), controller.update);
router.put("/:id", checkPermission("length-class", "update"), controller.update);
router.delete("/:id", checkPermission("length-class", "delete"), controller.remove);
export default router;
