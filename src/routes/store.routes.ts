import { Router } from "express";

import { StoreController } from "../controllers/store.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("store", "create"),
  StoreController.createStore,
);

router.get(
  "/",
  StoreController.getStores,
);

router.get(
  "/:id",
  StoreController.getStoreById,
);

router.patch(
  "/:id",
  authenticate,
  checkPermission("store", "update"),
  StoreController.updateStore,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("store", "delete"),
  StoreController.deleteStore,
);

export default router;