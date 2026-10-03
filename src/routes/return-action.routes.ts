import { Router } from "express";
import { ReturnActionController } from "../controllers/return-action.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("return-action", "create"),
  ReturnActionController.createReturnAction,
);

router.get(
  "/",
  authenticate,
  checkPermission("return-action", "read"),
  ReturnActionController.getReturnActions,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("return-action", "read"),
  ReturnActionController.getReturnActionById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("return-action", "update"),
  ReturnActionController.updateReturnAction,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("return-action", "delete"),
  ReturnActionController.deleteReturnAction,
);

export default router;