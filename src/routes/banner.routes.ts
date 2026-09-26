import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { BannerController } from "../controllers/banner.controller";

const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid banner ID" }); return; }
  next();
});
router.get("/export", checkPermission("banner", "read"), BannerController.export);
router.get("/", checkPermission("banner", "read"), BannerController.list);
router.get("/:id", checkPermission("banner", "read"), BannerController.get);
router.post("/", checkPermission("banner", "create"), BannerController.create);
router.patch("/:id", checkPermission("banner", "update"), BannerController.update);
router.put("/:id", checkPermission("banner", "update"), BannerController.update);
router.delete("/:id", checkPermission("banner", "delete"), BannerController.remove);
export default router;
