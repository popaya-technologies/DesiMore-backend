import { Router } from "express";
import { FaqController } from "../controllers/faq.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("faq", "create"),
  FaqController.createFaq,
);

router.get("/", FaqController.getFaqs);

router.get("/:id", FaqController.getFaqById);

router.put(
  "/:id",
  authenticate,
  checkPermission("faq", "update"),
  FaqController.updateFaq,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("faq", "delete"),
  FaqController.deleteFaq,
);

export default router;
