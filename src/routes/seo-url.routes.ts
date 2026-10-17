import { Router } from "express";
import { SeoUrlController } from "../controllers/seo-url.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("seo_url", "create"),
  SeoUrlController.createSeoUrl,
);

router.get(
  "/",
  authenticate,
  checkPermission("seo_url", "read"),
  SeoUrlController.getSeoUrls,
);

router.get(
  "/resolve/:keyword",
  SeoUrlController.resolveSeoUrl,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("seo_url", "read"),
  SeoUrlController.getSeoUrlById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("seo_url", "update"),
  SeoUrlController.updateSeoUrl,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("seo_url", "delete"),
  SeoUrlController.deleteSeoUrl,
);

export default router;
