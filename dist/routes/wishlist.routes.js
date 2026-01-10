"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const wishlist_controller_1 = require("../controllers/wishlist.controller");
const router = (0, express_1.Router)();
// Wishlist routes
router.get("/", auth_middleware_1.authenticate, wishlist_controller_1.WishlistController.getWishlist);
router.post("/:item", auth_middleware_1.authenticate, wishlist_controller_1.WishlistController.addItemByParam);
router.delete("/items/:itemId", auth_middleware_1.authenticate, wishlist_controller_1.WishlistController.removeItem);
router.post("/items/:itemId/move-to-cart", auth_middleware_1.authenticate, wishlist_controller_1.WishlistController.moveItemToCart);
router.delete("/", auth_middleware_1.authenticate, wishlist_controller_1.WishlistController.clearWishlist);
exports.default = router;
