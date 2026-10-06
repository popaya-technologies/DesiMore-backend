import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { ErrorLogController } from "../controllers/error-log.controller";

const router = Router();
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
router.use(authenticate);
router.get("/", checkPermission("error-log", "read"), ErrorLogController.read);
router.get("/download", checkPermission("error-log", "read"), ErrorLogController.download);
router.delete("/", checkPermission("error-log", "delete"), ErrorLogController.clear);
export default router;
