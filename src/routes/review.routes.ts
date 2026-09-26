import { Router } from "express";

import { ReviewController } from "../controllers/review.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("review", "create"),
  ReviewController.createReview,
);

router.get(
  "/",
  ReviewController.getReviews,
);

router.get(
  "/:id",
  ReviewController.getReviewById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("review", "update"),
  ReviewController.updateReview,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("review", "delete"),
  ReviewController.deleteReview,
);

export default router;