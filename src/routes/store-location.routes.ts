import { Router } from "express";

import { StoreLocationController } from "../controllers/store-location.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("store-location", "create"),
  StoreLocationController.createStoreLocation,
);

router.get(
  "/",
  authenticate,
  checkPermission("store-location", "read"),
  StoreLocationController.getStoreLocations,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("store-location", "read"),
  StoreLocationController.getStoreLocationById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("store-location", "update"),
  StoreLocationController.updateStoreLocation,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("store-location", "delete"),
  StoreLocationController.deleteStoreLocation,
);

export default router;
