import { Router } from "express";
import { GeoZoneController } from "../controllers/geo_zone.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("geo-zone", "create"),
  GeoZoneController.createGeoZone
);

router.get(
  "/",
  authenticate,
  checkPermission("geo-zone", "read"),
  GeoZoneController.getGeoZones
);

router.get(
  "/:id",
  authenticate,
  checkPermission("geo-zone", "read"),
  GeoZoneController.getGeoZoneById
);

router.put(
  "/:id",
  authenticate,
  checkPermission("geo-zone", "update"),
  GeoZoneController.updateGeoZone
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("geo-zone", "delete"),
  GeoZoneController.deleteGeoZone
);

export default router;