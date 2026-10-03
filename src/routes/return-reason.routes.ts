import { Router } from "express";

import { ReturnReasonController } from "../controllers/return-reason.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("return-reason", "create"),
  ReturnReasonController.createReturnReason,
);

router.get(
  "/",
  authenticate,
  checkPermission("return-reason", "read"),
  ReturnReasonController.getReturnReasons,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("return-reason", "read"),
  ReturnReasonController.getReturnReasonById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("return-reason", "update"),
  ReturnReasonController.updateReturnReason,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("return-reason", "delete"),
  ReturnReasonController.deleteReturnReason,
);

export default router;