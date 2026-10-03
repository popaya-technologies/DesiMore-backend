import { Router } from "express";

import { ZoneController } from "../controllers/zone.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("zone", "create"),
  ZoneController.createZone,
);

router.get(
  "/",
  authenticate,
  checkPermission("zone", "read"),
  ZoneController.getZones,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("zone", "read"),
  ZoneController.getZoneById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("zone", "update"),
  ZoneController.updateZone,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("zone", "delete"),
  ZoneController.deleteZone,
);

export default router;
