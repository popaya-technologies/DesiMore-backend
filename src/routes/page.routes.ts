import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { PageController } from "../controllers/page.controller";

const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid page ID" }); return; }
  next();
});
router.get("/export", checkPermission("page", "read"), PageController.export);
router.get("/", checkPermission("page", "read"), PageController.list);
router.get("/:id", checkPermission("page", "read"), PageController.get);
router.post("/", checkPermission("page", "create"), PageController.create);
router.patch("/:id", checkPermission("page", "update"), PageController.update);
router.put("/:id", checkPermission("page", "update"), PageController.update);
router.delete("/:id", checkPermission("page", "delete"), PageController.remove);
export default router;
