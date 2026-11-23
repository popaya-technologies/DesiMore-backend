import { Router } from "express";

import { ReviewController } from "../controllers/review.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission, requireStaff } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/product/:productId", ReviewController.getProductReviews);

router.post(
  "/product/:productId",
  authenticate,
  ReviewController.submitProductReview,
);

router.post(
  "/",
  authenticate,
  checkPermission("review", "create"),
  ReviewController.createReview,
);

// The full list includes unapproved reviews, so only staff may read it.
// Shoppers see approved reviews through /product/:productId above.
router.get(
  "/",
  authenticate,
  requireStaff,
  checkPermission("review", "read"),
  ReviewController.getReviews,
);

router.get(
  "/:id",
  authenticate,
  requireStaff,
  checkPermission("review", "read"),
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
