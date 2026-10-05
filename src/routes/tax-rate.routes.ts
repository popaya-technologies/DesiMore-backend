import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { TaxRateController as controller } from "../controllers/tax-rate.controller";
const router = Router();
router.use(authenticate);
router.get("/options", checkPermission("tax-rate", "read"), controller.options);
router.delete("/bulk", checkPermission("tax-rate", "delete"), controller.bulk);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid tax rate ID" }); return; }
  next();
});
router.get("/export", checkPermission("tax-rate", "read"), controller.export);
router.get("/", checkPermission("tax-rate", "read"), controller.list);
router.post("/", checkPermission("tax-rate", "create"), controller.create);
router.get("/:id", checkPermission("tax-rate", "read"), controller.get);
router.patch("/:id", checkPermission("tax-rate", "update"), controller.update);
router.put("/:id", checkPermission("tax-rate", "update"), controller.update);
router.delete("/:id", checkPermission("tax-rate", "delete"), controller.remove);
export default router;
