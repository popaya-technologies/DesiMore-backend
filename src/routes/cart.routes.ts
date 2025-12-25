import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { CartController } from "../controllers/cart.controller";

const router = Router();

// Cart routes
router.get("/", authenticate, CartController.getCart);
router.post("/items", authenticate, CartController.addToCart);
router.post("/buy-now", authenticate, CartController.createBuyNowCart);
router.put("/items/:itemId", authenticate, CartController.updateCartItem);
router.delete("/items/:itemId", authenticate, CartController.removeCartItem);
router.delete("/", authenticate, CartController.clearCart);

export default router;
