import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { TaxClassController as controller } from "../controllers/tax-class.controller";
const router = Router();
router.use(authenticate);
router.get("/tax-rates", checkPermission("tax-class", "read"), controller.rates);
router.post("/tax-rates", checkPermission("tax-class", "create"), controller.createRate);
router.delete("/bulk", checkPermission("tax-class", "delete"), controller.bulk);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid tax class ID" }); return; }
  next();
});
router.get("/export", checkPermission("tax-class", "read"), controller.export);
router.get("/", checkPermission("tax-class", "read"), controller.list);
router.post("/", checkPermission("tax-class", "create"), controller.create);
router.get("/:id", checkPermission("tax-class", "read"), controller.get);
router.patch("/:id", checkPermission("tax-class", "update"), controller.update);
router.put("/:id", checkPermission("tax-class", "update"), controller.update);
router.delete("/:id", checkPermission("tax-class", "delete"), controller.remove);
export default router;
