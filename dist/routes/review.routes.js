"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("../controllers/review.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
router.get("/product/:productId", review_controller_1.ReviewController.getProductReviews);
router.post("/product/:productId", auth_middleware_1.authenticate, review_controller_1.ReviewController.submitProductReview);
router.post("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("review", "create"), review_controller_1.ReviewController.createReview);
// The full list includes unapproved reviews, so only staff may read it.
// Shoppers see approved reviews through /product/:productId above.
router.get("/", auth_middleware_1.authenticate, rbac_middleware_1.requireStaff, (0, rbac_middleware_1.checkPermission)("review", "read"), review_controller_1.ReviewController.getReviews);
router.get("/:id", auth_middleware_1.authenticate, rbac_middleware_1.requireStaff, (0, rbac_middleware_1.checkPermission)("review", "read"), review_controller_1.ReviewController.getReviewById);
router.put("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("review", "update"), review_controller_1.ReviewController.updateReview);
router.delete("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("review", "delete"), review_controller_1.ReviewController.deleteReview);
exports.default = router;
