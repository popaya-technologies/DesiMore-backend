import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { CustomerApprovalController as controller } from "../controllers/customer-approval.controller";

const router = Router();

router.use(authenticate);

router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) {
    res.status(400).json({
      message: "Invalid customer approval ID",
    });
    return;
  }

  next();
});

router.get("/", checkPermission("customer-approval", "read"), controller.list);

router.get(
  "/:id",
  checkPermission("customer-approval", "read"),
  controller.get,
);

router.post(
  "/",
  checkPermission("customer-approval", "create"),
  controller.create,
);

router.post(
  "/:id/approve",
  checkPermission("customer-approval", "update"),
  controller.approve,
);

router.post(
  "/:id/reject",
  checkPermission("customer-approval", "update"),
  controller.reject,
);

export default router;
