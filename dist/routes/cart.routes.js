"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const cart_controller_1 = require("../controllers/cart.controller");
const router = (0, express_1.Router)();
// Cart routes
router.get("/", auth_middleware_1.authenticate, cart_controller_1.CartController.getCart);
router.post("/items", auth_middleware_1.authenticate, cart_controller_1.CartController.addToCart);
router.post("/buy-now", auth_middleware_1.authenticate, cart_controller_1.CartController.createBuyNowCart);
router.put("/items/:itemId", auth_middleware_1.authenticate, cart_controller_1.CartController.updateCartItem);
router.delete("/items/:itemId", auth_middleware_1.authenticate, cart_controller_1.CartController.removeCartItem);
router.delete("/", auth_middleware_1.authenticate, cart_controller_1.CartController.clearCart);
exports.default = router;
