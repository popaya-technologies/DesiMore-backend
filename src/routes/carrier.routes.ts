import { Router } from "express";
import { CarrierController } from "../controllers/carrier.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("carrier", "create"),
  CarrierController.createCarrier,
);

router.get("/", CarrierController.getCarriers);

router.get("/:id", CarrierController.getCarrierById);

router.put(
  "/:id",
  authenticate,
  checkPermission("carrier", "update"),
  CarrierController.updateCarrier,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("carrier", "delete"),
  CarrierController.deleteCarrier,
);

export default router;
